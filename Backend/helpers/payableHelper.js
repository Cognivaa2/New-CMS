
import mongoose from "mongoose";
import Payable from "../models/payable.models.js";
import PaymentTransaction from "../models/paymentTransaction.models.js";
import VendorAdvanceTxn from "../models/vendorAdvanceTxn.models.js";
import Vendor from "../models/vendors.models.js"; // adjust path to match your project
import Counter from "../models/counter.models.js"; // adjust path to match your project
import logger from "../utils/logger.utils.js";   // adjust path to match your project


// This function generates unique payable numbers for a company. takes companyId and creates sequential year-based payable identifiers using counter management. -------------------------- Ayan
export const generatePayableNumber = async (companyId) => {
    const year = new Date().getFullYear();
    const counterKey = `PAY-${companyId.toString()}-${year}`;
    const counter = await Counter.findOneAndUpdate(
        { key: counterKey },
        { $inc: { seq: 1 } },
        { new: true, upsert: true, setDefaultsOnInsert: true }
    ).lean();
    return `PAY-${year}-${String(counter.seq).padStart(4, "0")}`;
};


// This function derives payable payment status. takes totalAmount, paidAmount and advanceDeducted. calculates due amount and returns payment state as Paid, PartiallyPaid or Unpaid. -------------------------- Ayan
const deriveStatus = (totalAmount, paidAmount, advanceDeducted) => {
    const due = Math.max(totalAmount - paidAmount - advanceDeducted, 0);
    if (due === 0) return "Paid";
    if (paidAmount + advanceDeducted > 0) return "PartiallyPaid";
    return "Unpaid";
};


// This function creates a payable entry from a GRN. takes grn, amount, po and optional session. prevents duplicate payable creation and generates payable records linked to GRN procurement data. -------------------------- Ayan
export const createPayableFromGRN = async ({ grn, amount, po, session = null }) => {
    try {
        if (!amount || amount <= 0) return null;
        const companyId = grn.companyId;
        const payableNumber = await generatePayableNumber(companyId);
        const existing = await Payable.findOne({
            sourceType: "GRN",
            sourceId: grn._id,
        });
        if (existing) {
            logger.warn("[payableHelper] createPayableFromGRN: payable already exists", {
                grnId: grn._id, payableId: existing._id,
            });
            return existing;
        }
        const createOpts = session ? { session } : {};
        const [payable] = await Payable.create(
            [
                {
                    companyId,
                    projectId: grn.projectId,
                    payableNumber,
                    sourceType: "GRN",
                    sourceId: grn._id,
                    sourceNumber: grn.grnNumber,
                    poId: grn.poId || null,
                    vendorId: grn.vendorId || po?.vendorId || null,
                    vendorName: grn.vendorName || po?.vendorName || null,
                    totalAmount: parseFloat(amount.toFixed(2)),
                    paidAmount: 0,
                    advanceDeducted: 0,
                    dueAmount: parseFloat(amount.toFixed(2)),
                    status: "Unpaid",
                    createdBy: grn.createdBy || null,
                },
            ],
            createOpts
        );
        logger.info("[payableHelper] Payable created from GRN", {
            payableId: payable._id,
            payableNumber,
            grnId: grn._id,
            amount,
        });
        return payable;
    } catch (err) {
        if (err.code === 11000) {
            logger.warn("[payableHelper] createPayableFromGRN: duplicate, skipping", { grnId: grn._id });
            return null;
        }
        logger.error("[payableHelper] createPayableFromGRN failed", { error: err.message });
        throw err;
    }
};



// This function creates a payable entry from a work order. takes wo and optional session. prevents duplicate payable creation and generates payable records linked to work order contract value. -------------------------- Ayan
export const createPayableFromWO = async ({ wo, session = null }) => {
    try {
        const companyId = wo.companyId;
        const payableNumber = await generatePayableNumber(companyId);
        const existing = await Payable.findOne({ sourceType: "WO", sourceId: wo._id });
        if (existing) {
            logger.warn("[payableHelper] createPayableFromWO: payable already exists", { woId: wo._id });
            return existing;
        }
        const createOpts = session ? { session } : {};
        const [payable] = await Payable.create(
            [
                {
                    companyId,
                    projectId: wo.projectId,
                    payableNumber,
                    sourceType: "WO",
                    sourceId: wo._id,
                    sourceNumber: wo.woNumber,
                    poId: null,
                    vendorId: wo.vendorId || null,
                    vendorName: wo.vendorName || null,
                    totalAmount: parseFloat(wo.totalContractValue.toFixed(2)),
                    paidAmount: 0,
                    advanceDeducted: 0,
                    dueAmount: parseFloat(wo.totalContractValue.toFixed(2)),
                    status: "Unpaid",
                    createdBy: wo.approvedBy || wo.createdBy || null,
                },
            ],
            createOpts
        );
        logger.info("[payableHelper] Payable created from WO", {
            payableId: payable._id,
            payableNumber,
            woId: wo._id,
        });
        return payable;
    } catch (err) {
        if (err.code === 11000) {
            logger.warn("[payableHelper] createPayableFromWO: duplicate, skipping", { woId: wo._id });
            return null;
        }
        logger.error("[payableHelper] createPayableFromWO failed", { error: err.message });
        throw err;
    }
};


// This function creates a payable entry from a manual expense. takes expense and optional session. prevents duplicate payable creation and generates payable records linked to manual expense data. -------------------------- Ayan
export const createPayableFromManualExpense = async ({ expense, session = null }) => {
    try {
        const companyId = expense.companyId;
        const payableNumber = await generatePayableNumber(companyId);
        const existing = await Payable.findOne({ sourceType: "ManualExpense", sourceId: expense._id });
        if (existing) {
            logger.warn("[payableHelper] createPayableFromManualExpense: already exists", {
                expenseId: expense._id,
            });
            return existing;
        }
        const createOpts = session ? { session } : {};
        const [payable] = await Payable.create(
            [
                {
                    companyId,
                    projectId: expense.projectId,
                    payableNumber,
                    sourceType: "ManualExpense",
                    sourceId: expense._id,
                    sourceNumber: expense.expenseNumber,
                    poId: null,
                    vendorId: expense.vendorId || null,
                    vendorName: expense.vendorName || null,
                    totalAmount: parseFloat(expense.amount.toFixed(2)),
                    paidAmount: 0,
                    advanceDeducted: 0,
                    dueAmount: parseFloat(expense.amount.toFixed(2)),
                    status: "Unpaid",
                    createdBy: expense.createdBy || null,
                },
            ],
            createOpts
        );
        logger.info("[payableHelper] Payable created from ManualExpense", {
            payableId: payable._id,
            payableNumber,
            expenseId: expense._id,
        });
        return payable;
    } catch (err) {
        if (err.code === 11000) {
            logger.warn("[payableHelper] createPayableFromManualExpense: duplicate, skipping", {
                expenseId: expense._id,
            });
            return null;
        }
        logger.error("[payableHelper] createPayableFromManualExpense failed", { error: err.message });
        throw err;
    }
};



// This function synchronizes payable amount after GRN modification. takes grnId, newAmount, grnNumber and optional session. recalculates payable totals, due amount, payment status and appends edit history notes. -------------------------- Ayan
export const syncPayableAmountForGRN = async ({ grnId, newAmount, grnNumber, session = null }) => {
    try {
        const payable = await Payable.findOne(
            { sourceType: "GRN", sourceId: new mongoose.Types.ObjectId(grnId) },
            null,
            session ? { session } : {}
        );
        if (!payable) {
            logger.warn("[payableHelper] syncPayableAmountForGRN: no payable found", { grnId });
            return null;
        }
        if (payable.status === "Reversed") {
            logger.warn("[payableHelper] syncPayableAmountForGRN: payable is reversed, skipping", { grnId });
            return null;
        }
        const oldAmount = payable.totalAmount;
        const newAmountRounded = parseFloat(newAmount.toFixed(2));
        const newDue = Math.max(
            newAmountRounded - payable.paidAmount - payable.advanceDeducted,
            0
        );
        const newStatus = deriveStatus(newAmountRounded, payable.paidAmount, payable.advanceDeducted);
        const editNote = `Amount updated from ₹${oldAmount.toFixed(2)} to ₹${newAmountRounded.toFixed(2)} because ${grnNumber} was edited on ${new Date().toLocaleDateString("en-IN")}.`;
        const updateOpts = session ? { session } : {};
        const updated = await Payable.findByIdAndUpdate(
            payable._id,
            {
                $set: {
                    totalAmount: newAmountRounded,
                    dueAmount: newDue,
                    status: newStatus,
                    notes: payable.notes
                        ? `${payable.notes}\n${editNote}`
                        : editNote,
                },
            },
            { new: true, ...updateOpts }
        );
        logger.info("[payableHelper] Payable amount synced after GRN edit", {
            payableId: payable._id,
            oldAmount,
            newAmount: newAmountRounded,
            newDue,
            newStatus,
        });
        return updated;
    } catch (err) {
        logger.error("[payableHelper] syncPayableAmountForGRN failed", { error: err.message });
        throw err;
    }
};



// This function reverses a payable entry. takes sourceType, sourceId, reversalReason, reversedBy and optional session. marks payable as reversed and tracks reversal metadata with payment history awareness. -------------------------- Ayan
export const reversePayable = async ({
    sourceType,
    sourceId,
    reversalReason,
    reversedBy = null,
    session = null,
}) => {
    try {
        const payable = await Payable.findOne(
            {
                sourceType,
                sourceId: new mongoose.Types.ObjectId(sourceId),
            },
            null,
            session ? { session } : {}
        );
        if (!payable) {
            logger.warn("[payableHelper] reversePayable: no payable found", { sourceType, sourceId });
            return { payable: null, hadPayments: false };
        }
        if (payable.status === "Reversed") {
            logger.info("[payableHelper] reversePayable: already reversed", { payableId: payable._id });
            return { payable, hadPayments: false };
        }
        const hadPayments = payable.paidAmount + payable.advanceDeducted > 0;
        const updateOpts = session ? { session } : {};
        const updated = await Payable.findByIdAndUpdate(
            payable._id,
            {
                $set: {
                    status: "Reversed",
                    reversalReason,
                    reversedAt: new Date(),
                    reversedBy: reversedBy || null,
                },
            },
            { new: true, ...updateOpts }
        );
        logger.info("[payableHelper] Payable reversed", {
            payableId: payable._id,
            sourceType,
            sourceId,
            hadPayments,
            reversalReason,
        });
        return { payable: updated, hadPayments };
    } catch (err) {
        logger.error("[payableHelper] reversePayable failed", { error: err.message });
        throw err;
    }
};



// This function records payment against a payable. takes payableId, companyId, amount, advanceDeducted, payment details, proof files, notes and recordedBy. validates payable state, handles vendor advance deduction, creates payment transactions and updates payable balances within transaction handling. -------------------------- Ayan
export const recordPayment = async (opts) => {
    const {
        payableId,
        companyId,
        amount = 0,
        advanceDeducted: advanceDeductedRequested = 0,
        paymentDate,
        paymentMode,
        paymentModeOther = null,
        referenceNumber = null,
        proofImage = null,
        proofKey = null,
        notes = null,
        recordedBy,
    } = opts;
    const payable = await Payable.findOne({
        _id: new mongoose.Types.ObjectId(payableId),
        companyId: new mongoose.Types.ObjectId(companyId),
    });
    if (!payable) throw new Error("Payable not found");
    if (payable.status === "Paid") throw new Error("This payable is already fully paid");
    if (payable.status === "Reversed") throw new Error("Cannot record payment against a reversed payable");
    const totalSettled = parseFloat((amount + advanceDeductedRequested).toFixed(2));
    if (totalSettled <= 0) {
        throw new Error("Payment amount + advance deduction must be greater than zero");
    }
    if (amount === 0 && advanceDeductedRequested === 0) {
        throw new Error("Either a cash amount or an advance deduction must be provided");
    }
    if (totalSettled > parseFloat(payable.dueAmount.toFixed(2))) {
        throw new Error(
            `Payment total (₹${totalSettled}) exceeds the due amount (₹${payable.dueAmount.toFixed(2)})`
        );
    }
    let vendorDoc = null;
    if (advanceDeductedRequested > 0) {
        if (!payable.vendorId) {
            throw new Error("Cannot deduct advance: this payable is not linked to a vendor");
        }
        vendorDoc = await Vendor.findById(payable.vendorId);
        if (!vendorDoc) throw new Error("Vendor not found");

        const availableBalance = vendorDoc.advanceBalance || 0;
        if (advanceDeductedRequested > availableBalance) {
            throw new Error(
                `Advance deduction (₹${advanceDeductedRequested}) exceeds vendor advance balance (₹${availableBalance.toFixed(2)})`
            );
        }
    }
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const [txn] = await PaymentTransaction.create(
            [
                {
                    companyId: payable.companyId,
                    projectId: payable.projectId,
                    payableId: payable._id,
                    vendorId: payable.vendorId || null,
                    paymentDate: new Date(paymentDate),
                    paymentMode,
                    paymentModeOther: paymentModeOther || null,
                    amount: parseFloat(amount.toFixed(2)),
                    advanceDeducted: parseFloat(advanceDeductedRequested.toFixed(2)),
                    totalSettled,
                    referenceNumber: referenceNumber || null,
                    proofImage: proofImage || null,
                    proofKey: proofKey || null,
                    notes: notes || null,
                    recordedBy: new mongoose.Types.ObjectId(recordedBy),
                },
            ],
            { session }
        );
        if (advanceDeductedRequested > 0 && vendorDoc) {
            const newBalance = parseFloat(
                ((vendorDoc.advanceBalance || 0) - advanceDeductedRequested).toFixed(2)
            );
            await Vendor.findByIdAndUpdate(
                vendorDoc._id,
                {
                    $inc: { advanceBalance: -advanceDeductedRequested },
                    $set: { updatedBy: new mongoose.Types.ObjectId(recordedBy) },
                },
                { session }
            );
            await VendorAdvanceTxn.create(
                [
                    {
                        companyId: payable.companyId,
                        vendorId: vendorDoc._id,
                        txnType: "Debit",
                        amount: parseFloat(advanceDeductedRequested.toFixed(2)),
                        balanceAfter: newBalance,
                        paymentTransactionId: txn._id,
                        payableId: payable._id,
                        payableNumber: payable.payableNumber,
                        notes: `Advance deducted while paying ${payable.payableNumber}`,
                        recordedBy: new mongoose.Types.ObjectId(recordedBy),
                    },
                ],
                { session }
            );
        }
        const newPaid = parseFloat((payable.paidAmount + amount).toFixed(2));
        const newAdvDeducted = parseFloat(
            (payable.advanceDeducted + advanceDeductedRequested).toFixed(2)
        );
        const newDue = Math.max(
            parseFloat((payable.totalAmount - newPaid - newAdvDeducted).toFixed(2)),
            0
        );
        const newStatus = deriveStatus(payable.totalAmount, newPaid, newAdvDeducted);
        const updatedPayable = await Payable.findByIdAndUpdate(
            payable._id,
            {
                $set: {
                    paidAmount: newPaid,
                    advanceDeducted: newAdvDeducted,
                    dueAmount: newDue,
                    status: newStatus,
                    updatedBy: new mongoose.Types.ObjectId(recordedBy),
                },
            },
            { new: true, session }
        );
        await session.commitTransaction();
        session.endSession();
        logger.info("[payableHelper] Payment recorded", {
            payableId: payable._id,
            txnId: txn._id,
            amount,
            advanceDeductedRequested,
            newStatus,
            newDue,
        });
        return { payable: updatedPayable, transaction: txn, warning: null };
    } catch (err) {
        await session.abortTransaction();
        session.endSession();
        logger.error("[payableHelper] recordPayment failed", { error: err.message });
        throw err;
    }
};



// This function adds vendor advance balance. takes vendorId, companyId, amount, payment details, proof files, notes and recordedBy. updates vendor advance balance and creates vendor advance transaction records within transaction handling. -------------------------- Ayan
export const addVendorAdvance = async ({
    vendorId,
    companyId,
    amount,
    paymentDate,
    paymentMode,
    referenceNumber = null,
    proofImage = null,
    proofKey = null,
    notes = null,
    recordedBy,
}) => {
    if (!amount || amount <= 0) throw new Error("Advance amount must be positive");
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const vendor = await Vendor.findOneAndUpdate(
            {
                _id: new mongoose.Types.ObjectId(vendorId),
                companyId: new mongoose.Types.ObjectId(companyId),
                isDeleted: false,
            },
            {
                $inc: { advanceBalance: amount },
                $set: { updatedBy: new mongoose.Types.ObjectId(recordedBy) },
            },
            { new: true, session }
        );
        if (!vendor) throw new Error("Vendor not found");
        const txn = await VendorAdvanceTxn.create(
            [
                {
                    companyId: new mongoose.Types.ObjectId(companyId),
                    vendorId: vendor._id,
                    txnType: "Credit",
                    amount: parseFloat(amount.toFixed(2)),
                    balanceAfter: parseFloat(vendor.advanceBalance.toFixed(2)),
                    paymentDate: new Date(paymentDate),
                    paymentMode,
                    referenceNumber: referenceNumber || null,
                    proofImage: proofImage || null,
                    proofKey: proofKey || null,
                    notes: notes || null,
                    recordedBy: new mongoose.Types.ObjectId(recordedBy),
                },
            ],
            { session }
        );
        await session.commitTransaction();
        session.endSession();
        logger.info("[payableHelper] Vendor advance added", {
            vendorId: vendor._id,
            amount,
            newBalance: vendor.advanceBalance,
        });
        return { vendor, txn: txn[0] };
    } catch (err) {
        await session.abortTransaction();
        session.endSession();
        logger.error("[payableHelper] addVendorAdvance failed", { error: err.message });
        throw err;
    }
};