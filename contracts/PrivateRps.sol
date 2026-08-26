// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@coti-io/coti-contracts/contracts/utils/mpc/MpcCore.sol";

/// @title HushHand Private RPS
/// @notice Two players stake native COTI and commit encrypted moves.
/// Winner is computed with COTI MPC without publishing the gestures.
/// Win rake goes to feeRecipient. Draw rake funds a stake-weighted lottery.
contract PrivateRps {
    enum Status {
        None,
        Open,
        Ready,
        Settled,
        Canceled
    }

    struct Match {
        address payable playerA;
        address payable playerB;
        uint256 grossStake;
        uint256 escrowEach;
        utUint64 moveA;
        utUint64 moveB;
        Status status;
        uint64 createdAt;
    }

    uint16 public constant BPS_DENOMINATOR = 10_000;
    uint16 public constant MAX_FEE_BPS = 500;

    address public owner;
    address payable public feeRecipient;
    uint16 public feeBps;
    uint256 public minStake;
    uint256 public nextMatchId = 1;

    mapping(uint256 => Match) private matches;
    uint256[] private openIds;
    mapping(uint256 => uint256) private openIndex; // id => index+1

    uint256 public lotteryPot;
    uint256 public lotteryRound;
    uint256 public totalTickets;
    uint256 public minLotteryPot;
    mapping(uint256 => mapping(address => uint256)) public tickets;
    mapping(uint256 => address[]) private lotteryPlayers;

    event FeeRecipientUpdated(address indexed recipient);
    event FeeBpsUpdated(uint16 feeBps);
    event MinLotteryPotUpdated(uint256 minLotteryPot);
    event MatchOpened(
        uint256 indexed matchId,
        address indexed player,
        uint256 grossStake,
        uint256 escrowEach,
        uint256 fee
    );
    event MatchJoined(uint256 indexed matchId, address indexed player);
    event MatchSettled(
        uint256 indexed matchId,
        address indexed winner,
        address indexed loser,
        uint256 pot,
        bool draw
    );
    event MatchCanceled(uint256 indexed matchId, address indexed player);
    event LotteryTicketsIssued(
        uint256 indexed round,
        address indexed player,
        uint256 tickets,
        uint256 indexed matchId
    );
    event LotteryFunded(uint256 indexed round, uint256 amount, uint256 indexed matchId);
    event LotteryDrawn(
        uint256 indexed round,
        address indexed winner,
        uint256 prize,
        uint256 totalTickets
    );

    modifier onlyOwner() {
        require(msg.sender == owner, "not owner");
        _;
    }

    constructor(
        address payable _feeRecipient,
        uint16 _feeBps,
        uint256 _minStake,
        uint256 _minLotteryPot
    ) {
        require(_feeRecipient != address(0), "fee recipient");
        require(_feeBps <= MAX_FEE_BPS, "fee too high");
        owner = msg.sender;
        feeRecipient = _feeRecipient;
        feeBps = _feeBps;
        minStake = _minStake;
        minLotteryPot = _minLotteryPot;
    }

    function setFeeRecipient(address payable _feeRecipient) external onlyOwner {
        require(_feeRecipient != address(0), "fee recipient");
        feeRecipient = _feeRecipient;
        emit FeeRecipientUpdated(_feeRecipient);
    }

    function setFeeBps(uint16 _feeBps) external onlyOwner {
        require(_feeBps <= MAX_FEE_BPS, "fee too high");
        feeBps = _feeBps;
        emit FeeBpsUpdated(_feeBps);
    }

    function setMinLotteryPot(uint256 _minLotteryPot) external onlyOwner {
        minLotteryPot = _minLotteryPot;
        emit MinLotteryPotUpdated(_minLotteryPot);
    }

    function getOpenMatchIds() external view returns (uint256[] memory) {
        return openIds;
    }

    function getLotteryPlayers() external view returns (address[] memory) {
        return lotteryPlayers[lotteryRound];
    }

    function ticketsOf(address player) external view returns (uint256) {
        return tickets[lotteryRound][player];
    }

    function canDrawLottery() public view returns (bool) {
        return lotteryPot > 0 && totalTickets > 0 && lotteryPot >= minLotteryPot;
    }

    function getMatch(
        uint256 matchId
    )
        external
        view
        returns (
            address playerA,
            address playerB,
            uint256 grossStake,
            uint256 escrowEach,
            Status status,
            uint64 createdAt
        )
    {
        Match storage m = matches[matchId];
        return (
            m.playerA,
            m.playerB,
            m.grossStake,
            m.escrowEach,
            m.status,
            m.createdAt
        );
    }

    function createMatch(itUint64 calldata move) external payable returns (uint256 matchId) {
        require(msg.value >= minStake, "stake too low");
        uint256 fee = (msg.value * feeBps) / BPS_DENOMINATOR;
        uint256 escrow = msg.value - fee;
        require(escrow > 0, "escrow empty");

        gtUint64 gtMove = MpcCore.validateCiphertext(move);

        matchId = nextMatchId++;
        Match storage m = matches[matchId];
        m.playerA = payable(msg.sender);
        m.grossStake = msg.value;
        m.escrowEach = escrow;
        m.moveA = MpcCore.offBoardCombined(gtMove, msg.sender);
        m.status = Status.Open;
        m.createdAt = uint64(block.timestamp);

        _addOpen(matchId);
        emit MatchOpened(matchId, msg.sender, msg.value, escrow, fee);
    }

    function joinMatch(uint256 matchId, itUint64 calldata move) external payable {
        Match storage m = matches[matchId];
        require(m.status == Status.Open, "not open");
        require(msg.sender != m.playerA, "same player");
        require(msg.value == m.grossStake, "wrong stake");

        gtUint64 gtMove = MpcCore.validateCiphertext(move);

        m.playerB = payable(msg.sender);
        m.moveB = MpcCore.offBoardCombined(gtMove, msg.sender);
        m.status = Status.Ready;
        _removeOpen(matchId);

        emit MatchJoined(matchId, msg.sender);
    }

    function cancelMatch(uint256 matchId) external {
        Match storage m = matches[matchId];
        require(m.status == Status.Open, "not open");
        require(msg.sender == m.playerA, "not creator");
        m.status = Status.Canceled;
        _removeOpen(matchId);
        emit MatchCanceled(matchId, msg.sender);
        _send(m.playerA, m.grossStake);
    }

    /// @notice Computes the winner from encrypted moves. Gestures stay private.
    function settle(uint256 matchId) external {
        Match storage m = matches[matchId];
        require(m.status == Status.Ready, "not ready");

        gtUint64 a = MpcCore.onBoard(m.moveA.ciphertext);
        gtUint64 b = MpcCore.onBoard(m.moveB.ciphertext);

        bool draw = MpcCore.decrypt(MpcCore.eq(a, b));
        m.status = Status.Settled;

        _issueTickets(m.playerA, m.grossStake, matchId);
        _issueTickets(m.playerB, m.grossStake, matchId);

        uint256 feeEach = m.grossStake - m.escrowEach;

        if (draw) {
            if (feeEach > 0) {
                uint256 rake = feeEach * 2;
                lotteryPot += rake;
                emit LotteryFunded(lotteryRound, rake, matchId);
            }
            emit MatchSettled(matchId, m.playerA, m.playerB, 0, true);
            _send(m.playerA, m.escrowEach);
            _send(m.playerB, m.escrowEach);
            return;
        }

        // (a - b + 3) % 3 == 1 => A wins. Encoding: rock=1, paper=2, scissors=3.
        gtUint64 diff = MpcCore.rem(MpcCore.sub(MpcCore.add(a, uint64(3)), b), uint64(3));
        bool aWins = MpcCore.decrypt(MpcCore.eq(diff, uint64(1)));

        address payable winner = aWins ? m.playerA : m.playerB;
        address payable loser = aWins ? m.playerB : m.playerA;
        uint256 pot = m.escrowEach * 2;
        emit MatchSettled(matchId, winner, loser, pot, false);
        if (feeEach > 0) {
            _send(feeRecipient, feeEach * 2);
        }
        _send(winner, pot);
    }

    /// @notice Pays the lottery pot to one ticket holder, weighted by stake-tickets.
    /// Anyone may call once the pot meets minLotteryPot. Owner may draw earlier.
    function drawLottery() external {
        require(lotteryPot > 0 && totalTickets > 0, "empty lottery");
        require(canDrawLottery() || msg.sender == owner, "pot too small");

        address[] storage players = lotteryPlayers[lotteryRound];
        require(players.length > 0, "no players");

        uint64 entropy = MpcCore.decrypt(MpcCore.rand64());
        uint256 needle = uint256(entropy) % totalTickets;
        uint256 acc;
        address payable winner;
        for (uint256 i = 0; i < players.length; i++) {
            acc += tickets[lotteryRound][players[i]];
            if (needle < acc) {
                winner = payable(players[i]);
                break;
            }
        }
        require(winner != address(0), "no winner");

        uint256 prize = lotteryPot;
        uint256 round = lotteryRound;
        uint256 weight = totalTickets;
        lotteryPot = 0;
        totalTickets = 0;
        lotteryRound = round + 1;

        emit LotteryDrawn(round, winner, prize, weight);
        _send(winner, prize);
    }

    function _issueTickets(address player, uint256 stake, uint256 matchId) private {
        uint256 round = lotteryRound;
        if (tickets[round][player] == 0) {
            lotteryPlayers[round].push(player);
        }
        tickets[round][player] += stake;
        totalTickets += stake;
        emit LotteryTicketsIssued(round, player, stake, matchId);
    }

    function _addOpen(uint256 matchId) private {
        openIndex[matchId] = openIds.length + 1;
        openIds.push(matchId);
    }

    function _removeOpen(uint256 matchId) private {
        uint256 index = openIndex[matchId];
        if (index == 0) {
            return;
        }
        uint256 last = openIds[openIds.length - 1];
        openIds[index - 1] = last;
        openIndex[last] = index;
        openIds.pop();
        openIndex[matchId] = 0;
    }

    function _send(address payable to, uint256 amount) private {
        (bool ok, ) = to.call{value: amount}("");
        require(ok, "transfer failed");
    }
}
