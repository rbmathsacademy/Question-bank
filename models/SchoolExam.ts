import mongoose from 'mongoose';

const SchoolExamSchema = new mongoose.Schema({
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'BatchStudent', required: true },
    studentPhone: { type: String, required: true },
    batch: { type: String, required: true },
    schoolName: { type: String },
    examName: { type: String, required: true },
    date: { type: Date, required: true },
    fullMarks: { type: Number, required: true },
    marksObtained: { type: Number, required: true },
    percentage: { type: Number, required: true }
}, { timestamps: true });

SchoolExamSchema.index({ batch: 1, date: -1 });
SchoolExamSchema.index({ studentPhone: 1 });

if (process.env.NODE_ENV === "development") {
    delete mongoose.models.SchoolExam;
}

export default mongoose.models.SchoolExam || mongoose.model('SchoolExam', SchoolExamSchema);
