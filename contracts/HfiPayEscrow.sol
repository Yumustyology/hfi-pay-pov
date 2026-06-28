// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract HfiPayEscrow {

    uint256 public nextPaymentId;

    uint256 public constant CLAIM_PERIOD = 7 days;

    struct Payment {
        uint256 id;
        address sender;
        address recipient;
        uint256 amount;
        uint256 createdAt;
        uint256 expiry;
        bool claimed;
        bool refunded;
    }

    mapping(uint256 => Payment) public payments;

    event PaymentCreated(
        uint256 indexed id,
        address indexed sender,
        address indexed recipient,
        uint256 amount
    );

    event PaymentClaimed(
        uint256 indexed id,
        address indexed recipient
    );

    event PaymentRefunded(
        uint256 indexed id,
        address indexed sender
    );

    function createPayment(
        address recipient
    )
        external
        payable
    {
        require(
            recipient != address(0),
            "Invalid recipient"
        );

        require(
            msg.value > 0,
            "No ETH sent"
        );

        payments[nextPaymentId] = Payment({
            id: nextPaymentId,
            sender: msg.sender,
            recipient: recipient,
            amount: msg.value,
            createdAt: block.timestamp,
            expiry: block.timestamp + CLAIM_PERIOD,
            claimed: false,
            refunded: false
        });

        emit PaymentCreated(
            nextPaymentId,
            msg.sender,
            recipient,
            msg.value
        );

        nextPaymentId++;
    }

    function claimPayment(
        uint256 paymentId
    )
        external
    {
        Payment storage payment = payments[paymentId];

        require(
            msg.sender == payment.recipient,
            "Not recipient"
        );

        require(
            !payment.claimed,
            "Already claimed"
        );

        require(
            !payment.refunded,
            "Refunded"
        );

        payment.claimed = true;

        payable(payment.recipient)
            .transfer(payment.amount);

        emit PaymentClaimed(
            paymentId,
            payment.recipient
        );
    }

    function refundPayment(
        uint256 paymentId
    )
        external
    {
        Payment storage payment = payments[paymentId];

        require(
            msg.sender == payment.sender,
            "Not sender"
        );

        require(
            block.timestamp > payment.expiry,
            "Not expired"
        );

        require(
            !payment.claimed,
            "Already claimed"
        );

        require(
            !payment.refunded,
            "Already refunded"
        );

        payment.refunded = true;

        payable(payment.sender)
            .transfer(payment.amount);

        emit PaymentRefunded(
            paymentId,
            payment.sender
        );
    }

    function getPayment(uint256 paymentId) external view returns (Payment memory) {
        return payments[paymentId];
    }
}
