const mongoose = require("mongoose");

const visitorSchema = new mongoose.Schema({
    ip: { type: String, required: true },
    visitDate: { type: String, required: true }, // รูปแบบ "YYYY-MM-DD" ตามเวลา Asia/Bangkok
    firstVisitAt: { type: Date, required: true },
    lastVisitAt: { type: Date, required: true },
    hitCount: { type: Number, default: 1 }
});

// Unique constraint (PK) ระหว่าง IP + วันที่เข้าชม
visitorSchema.index({ ip: 1, visitDate: 1 }, { unique: true });

module.exports = mongoose.models.Visitor || mongoose.model("Visitor", visitorSchema);