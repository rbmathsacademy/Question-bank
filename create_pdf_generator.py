with open('app/admin/analytics/generateSchoolReportPDF.ts', 'w', encoding='utf-8') as f: f.write(r'''import jsPDF from 'jspdf';

const COLORS = {
    navy: [30, 58, 95] as [number, number, number],
    blue: [37, 99, 235] as [number, number, number],
    green: [16, 185, 129] as [number, number, number],
    red: [249, 115, 22] as [number, number, number],
    gray: [107, 114, 128] as [number, number, number],
    lightGray: [243, 244, 246] as [number, number, number],
    white: [255, 255, 255] as [number, number, number],
};

export const generateSchoolReportPDF = (student: any, exam: any, correlation: any) => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const PAGE_W = 210;
    const PAGE_H = 297;
    const MARGIN = 20;

    const addText = (text: string, x: number, y: number, size: number, color: number[], font = 'helvetica', style = 'normal', align: "left" | "center" | "right" = 'left') => {
        doc.setFont(font, style);
        doc.setFontSize(size);
        doc.setTextColor(color[0], color[1], color[2]);
        doc.text(text, x, y, { align });
    };

    doc.setFillColor(COLORS.navy[0], COLORS.navy[1], COLORS.navy[2]);
    doc.rect(0, 0, PAGE_W, 40, 'F');

    addText('RB MATHS ACADEMY', PAGE_W / 2, 20, 24, COLORS.white, 'helvetica', 'bold', 'center');
    addText('School Performance & Trajectory Report', PAGE_W / 2, 30, 12, COLORS.white, 'helvetica', 'normal', 'center');

    let currentY = 55;
    
    doc.setFillColor(COLORS.lightGray[0], COLORS.lightGray[1], COLORS.lightGray[2]);
    doc.roundedRect(MARGIN, currentY, PAGE_W - (MARGIN * 2), 30, 3, 3, 'F');

    addText('Student Details', MARGIN + 10, currentY + 10, 12, COLORS.gray, 'helvetica', 'bold');
    addText(`Name: ${student.name}`, MARGIN + 10, currentY + 18, 14, COLORS.navy, 'helvetica', 'bold');
    addText(`Phone: ${student.phoneNumber}`, MARGIN + 10, currentY + 25, 11, COLORS.navy);
    
    addText(`School: ${exam.schoolName || student.schoolName || 'Not specified'}`, PAGE_W - MARGIN - 10, currentY + 18, 11, COLORS.navy, 'helvetica', 'normal', 'right');
    addText(`Batch: ${exam.batch}`, PAGE_W - MARGIN - 10, currentY + 25, 11, COLORS.navy, 'helvetica', 'normal', 'right');

    currentY += 45;

    addText(`Exam: ${exam.examName}`, PAGE_W / 2, currentY, 18, COLORS.navy, 'helvetica', 'bold', 'center');
    addText(`Date: ${new Date(exam.date).toLocaleDateString()}`, PAGE_W / 2, currentY + 7, 11, COLORS.gray, 'helvetica', 'normal', 'center');
    
    currentY += 20;

    const scoreText = `${exam.marksObtained} / ${exam.fullMarks}`;
    addText(scoreText, PAGE_W / 2, currentY, 32, COLORS.navy, 'helvetica', 'bold', 'center');
    addText(`(${exam.percentage.toFixed(1)}%)`, PAGE_W / 2, currentY + 10, 16, COLORS.gray, 'helvetica', 'normal', 'center');

    currentY += 30;

    doc.setDrawColor(COLORS.lightGray[0], COLORS.lightGray[1], COLORS.lightGray[2]);
    doc.setLineWidth(1);
    doc.line(MARGIN, currentY, PAGE_W - MARGIN, currentY);
    
    currentY += 15;

    addText('Practice Analysis (Prior to this Exam)', PAGE_W / 2, currentY, 14, COLORS.navy, 'helvetica', 'bold', 'center');
    currentY += 10;
    addText('We tracked the regular tests and assignments completed before this school exam.', PAGE_W / 2, currentY, 10, COLORS.gray, 'helvetica', 'italic', 'center');

    currentY += 15;

    const colWidth = (PAGE_W - (MARGIN * 2)) / 3;
    
    addText('Online Practice', MARGIN + (colWidth / 2), currentY, 10, COLORS.gray, 'helvetica', 'bold', 'center');
    addText(correlation.priorAvgOnline > 0 ? `${correlation.priorAvgOnline}%` : 'N/A', MARGIN + (colWidth / 2), currentY + 8, 14, COLORS.navy, 'helvetica', 'bold', 'center');
    
    addText('Offline Mocks', MARGIN + colWidth + (colWidth / 2), currentY, 10, COLORS.gray, 'helvetica', 'bold', 'center');
    addText(correlation.priorAvgOffline > 0 ? `${correlation.priorAvgOffline}%` : 'N/A', MARGIN + colWidth + (colWidth / 2), currentY + 8, 14, COLORS.navy, 'helvetica', 'bold', 'center');
    
    addText('Assignments', MARGIN + (colWidth * 2) + (colWidth / 2), currentY, 10, COLORS.gray, 'helvetica', 'bold', 'center');
    addText(correlation.priorAssignmentScore > 0 ? `${correlation.priorAssignmentScore}%` : 'N/A', MARGIN + (colWidth * 2) + (colWidth / 2), currentY + 8, 14, COLORS.navy, 'helvetica', 'bold', 'center');

    currentY += 25;

    const chartY = currentY;
    const maxBarW = PAGE_W - (MARGIN * 2) - 80; 
    
    addText('System Prediction:', MARGIN, chartY + 5, 11, COLORS.navy, 'helvetica', 'bold');
    doc.setFillColor(COLORS.lightGray[0], COLORS.lightGray[1], COLORS.lightGray[2]);
    doc.rect(MARGIN + 45, chartY, maxBarW, 8, 'F');
    if (correlation.priorSystemAvg > 0) {
        doc.setFillColor(COLORS.blue[0], COLORS.blue[1], COLORS.blue[2]);
        doc.rect(MARGIN + 45, chartY, (correlation.priorSystemAvg / 100) * maxBarW, 8, 'F');
        addText(`${correlation.priorSystemAvg}%`, MARGIN + 45 + ((correlation.priorSystemAvg / 100) * maxBarW) + 2, chartY + 6, 10, COLORS.blue, 'helvetica', 'bold');
    }

    addText('School Actual:', MARGIN, chartY + 20, 11, COLORS.navy, 'helvetica', 'bold');
    doc.setFillColor(COLORS.lightGray[0], COLORS.lightGray[1], COLORS.lightGray[2]);
    doc.rect(MARGIN + 45, chartY + 15, maxBarW, 8, 'F');
    
    let barColor = COLORS.blue;
    if (correlation.syncStatus === 'IMPROVED') barColor = COLORS.green;
    else if (correlation.syncStatus === 'DETERIORATED') barColor = COLORS.red;

    doc.setFillColor(barColor[0], barColor[1], barColor[2]);
    doc.rect(MARGIN + 45, chartY + 15, (exam.percentage / 100) * maxBarW, 8, 'F');
    addText(`${exam.percentage.toFixed(1)}%`, MARGIN + 45 + ((exam.percentage / 100) * maxBarW) + 2, chartY + 21, 10, barColor, 'helvetica', 'bold');

    currentY += 45;

    doc.setFillColor(barColor[0], barColor[1], barColor[2]);
    doc.rect(MARGIN, currentY, 3, 20, 'F');
    
    let insightTitle = "Consistent Performance";
    let insightDesc = "Your child's school performance aligns perfectly with their regular practice. Keep up the good work!";
    
    if (correlation.syncStatus === 'IMPROVED') {
        insightTitle = "Fantastic Improvement! \u2191";
        insightDesc = "Your child exceeded our system's expectations. Their hard work and test strategies paid off beautifully!";
    } else if (correlation.syncStatus === 'DETERIORATED') {
        insightTitle = "Needs Focus \u26A0";
        insightDesc = "Your child scored lower than their regular practice suggested. We will focus on exam temperament and revision strategies.";
    }

    addText(insightTitle, MARGIN + 8, currentY + 6, 14, barColor, 'helvetica', 'bold');
    
    doc.setFontSize(11);
    doc.setTextColor(COLORS.navy[0], COLORS.navy[1], COLORS.navy[2]);
    doc.setFont('helvetica', 'normal');
    const splitDesc = doc.splitTextToSize(insightDesc, PAGE_W - (MARGIN * 2) - 10);
    doc.text(splitDesc, MARGIN + 8, currentY + 14);

    const footerY = PAGE_H - 15;
    doc.setDrawColor(COLORS.gray[0], COLORS.gray[1], COLORS.gray[2]);
    doc.setLineWidth(0.5);
    doc.line(MARGIN, footerY - 5, PAGE_W - MARGIN, footerY - 5);
    
    addText('RB Maths Academy - Dr. Ritwick Banerjee', MARGIN, footerY + 2, 9, COLORS.gray);
    addText(new Date().toLocaleDateString(), PAGE_W - MARGIN, footerY + 2, 9, COLORS.gray, 'helvetica', 'normal', 'right');

    const cleanName = student.name.replace(/[^a-zA-Z0-9]/g, '_');
    const cleanExam = exam.examName.replace(/[^a-zA-Z0-9]/g, '_');
    doc.save(`Performance_Report_${cleanName}_${cleanExam}.pdf`);
};''')
