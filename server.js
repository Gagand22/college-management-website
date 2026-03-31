const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

// --- 1. DATABASE CONNECTION ---
const MONGO_URI = 'mongodb://127.0.0.1:27017/uniportal_db'; // Local DB
mongoose.connect(MONGO_URI)
    .then(() => console.log('✅ Connected to MongoDB'))
    .catch(err => console.error('❌ MongoDB Connection Error:', err));

// --- 2. DATABASE SCHEMAS & MODELS ---

// User Schema (Handles Students, Teachers, Admin)
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['admin', 'teacher', 'student'], required: true },
    name: { type: String, required: true },
    // Student Fields
    course: { type: String },
    rollNumber: { type: String },
    email: { type: String },
    mobile: { type: String },
    semester: { type: Number },
    // Teacher Fields
    subjects: [{ type: String }]
});

const User = mongoose.model('User', userSchema);

// Course Schema (Stores subjects for each course)
const courseSchema = new mongoose.Schema({
    name: { type: String, unique: true },
    subjects: [String]
});

const Course = mongoose.model('Course', courseSchema);

// Attendance Schema
const attendanceSchema = new mongoose.Schema({
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    date: String,
    subject: String,
    period: Number,
    status: { type: String, enum: ['present', 'absent'] }
});

// Index to prevent duplicate attendance entries
attendanceSchema.index({ studentId: 1, date: 1, subject: 1, period: 1 }, { unique: true });
const Attendance = mongoose.model('Attendance', attendanceSchema);

// --- 3. SEED DATA (Populate DB if empty) ---
async function seedDatabase() {
    const countUsers = await User.countDocuments();
    const countCourses = await Course.countDocuments();

    if (countUsers === 0) {
        console.log("🌱 Seeding Users...");
        await User.create([
            { id: 1, username: "admin", password: "admin123", role: "admin", name: "System Admin" },
            { id: 50, username: "teacher1", password: "teacher123", role: "teacher", name: "Mr. Anil Kumar", subjects: ["Java Programming", "Data Structures"] },
            { id: 51, username: "teacher2", password: "teacher123", role: "teacher", name: "Ms. Sunita Singh", subjects: ["Business Studies", "Marketing Mgmt"] },
            { id: 101, username: "student1", password: "123", role: "student", name: "Rahul Sharma", course: "BCA", rollNumber: "BCA-01", email: "rahul@college.edu", mobile: "9876543210", semester: 3 },
            { id: 102, username: "student2", password: "123", role: "student", name: "Priya Singh", course: "BCA", rollNumber: "BCA-02", email: "priya@college.edu", mobile: "9876543211", semester: 3 },
            { id: 103, username: "student3", password: "123", role: "student", name: "Amit Verma", course: "BBA", rollNumber: "BBA-01", email: "amit@college.edu", mobile: "9876543212", semester: 3 },
            { id: 104, username: "student4", password: "123", role: "student", name: "Sneha Kapoor", course: "BBA", rollNumber: "BBA-02", email: "sneha@college.edu", mobile: "9876543213", semester: 3 },
            { id: 105, username: "student5", password: "123", role: "student", name: "Vijay Kumar", course: "BCOM", rollNumber: "BCOM-01", email: "vijay@college.edu", mobile: "9876543214", semester: 3 }
        ]);
    }

    if (countCourses === 0) {
        console.log("🌱 Seeding Courses...");
        await Course.create([
            { name: "BCA", subjects: ["Java Programming", "Data Structures", "DBMS", "Computer Networks", "Operating Systems"] },
            { name: "BBA", subjects: ["Business Studies", "Marketing Mgmt", "HR Management", "Business Law", "Business Ethics"] },
            { name: "BCOM", subjects: ["Accounting", "Economics", "Taxation", "Business Stats", "Banking"] }
        ]);
    }
}
seedDatabase();

// --- 4. MIDDLEWARE ---
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'frontend'))); // Ensure your HTML/CSS/JS are in a 'frontend' folder
app.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    next();
});

// --- 5. HELPERS ---

// Generate Timetable (Logic is same, but fetches subjects from DB)
async function generateTimetable(courseName) {
    const courseDoc = await Course.findOne({ name: courseName });
    if (!courseDoc) return {};
    const subs = courseDoc.subjects;
    
    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    let schedule = {};
    days.forEach((day, index) => {
        let isOddDay = ((index + 1) % 2 !== 0);
        if (isOddDay) {
            schedule[day] = [
                { time: "02:00 PM - 02:50 PM", subject: subs[0] || "General", room: "Room 101", period: 1 },
                { time: "02:50 PM - 03:40 PM", subject: subs[1] || "General", room: "Room 102", period: 2 },
                { time: "03:40 PM - 04:30 PM", subject: subs[2] || "General", room: "Lab A", period: 3 },
                { time: "04:30 PM - 05:20 PM", subject: subs[3] || "General", room: "Lab B", period: 4 }
            ];
        } else {
            schedule[day] = [
                { time: "09:00 AM - 09:50 AM", subject: subs[4] || "General", room: "Room 201", period: 1 },
                { time: "09:50 AM - 10:40 AM", subject: subs[0] || "General", room: "Room 202", period: 2 },
                { time: "10:40 AM - 11:30 AM", subject: subs[1] || "General", room: "Room 203", period: 3 },
                { time: "11:30 AM - 12:20 PM", subject: subs[2] || "General", room: "Lab C", period: 4 }
            ];
        }
    });
    return schedule;
}

// Calculate Attendance Stats (Queries DB)
async function calculateAttendance(studentId) {
    const records = await Attendance.find({ studentId: studentId });
    
    const totalClasses = records.length;
    const presentCount = records.filter(r => r.status === 'present').length;
    const semesterPercentage = totalClasses === 0 ? 0 : ((presentCount / totalClasses) * 100).toFixed(1);

    const currentMonth = new Date().getMonth();
    const monthlyRecords = records.filter(r => new Date(r.date).getMonth() === currentMonth);
    const monthlyTotal = monthlyRecords.length;
    const monthlyPresent = monthlyRecords.filter(r => r.status === 'present').length;
    const monthlyPercentage = monthlyTotal === 0 ? 0 : ((monthlyPresent / monthlyTotal) * 100).toFixed(1);

    return { semesterPercentage, total: totalClasses, present: presentCount, monthlyPercentage, monthlyTotal, monthlyPresent };
}

async function calculateSubjectAttendance(studentId) {
    const records = await Attendance.find({ studentId: studentId });
    let subjectStats = {};
    records.forEach(record => {
        if (!subjectStats[record.subject]) subjectStats[record.subject] = { total: 0, present: 0 };
        subjectStats[record.subject].total++;
        if (record.status === 'present') subjectStats[record.subject].present++;
    });
    let result = [];
    for (let sub in subjectStats) {
        let stats = subjectStats[sub];
        let percent = ((stats.present / stats.total) * 100).toFixed(1);
        result.push({ subject: sub, present: stats.present, total: stats.total, percentage: percent, isShortage: percent < 75 });
    }
    return result;
}

// --- 6. ROUTES ---

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await User.findOne({ username: username, password: password });
        if (user) {
            // Convert mongoose document to plain object and remove password
            const userObj = user.toObject();
            delete userObj.password;
            // Frontend expects 'id', Mongoose uses '_id'. We map _id to id for compatibility.
            userObj.id = userObj._id.toString(); 
            res.json({ success: true, user: userObj });
        } else {
            res.status(401).json({ success: false, message: "Invalid Credentials" });
        }
    } catch (err) {
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

app.get('/api/student/subjects/:course', async (req, res) => {
    const course = await Course.findOne({ name: req.params.course });
    res.json(course ? course.subjects : []);
});

app.get('/api/student/timetable/:course', async (req, res) => {
    res.json(await generateTimetable(req.params.course));
});

app.get('/api/student/attendance/:id', async (req, res) => {
    try {
        const overall = await calculateAttendance(req.params.id);
        const subjectWise = await calculateSubjectAttendance(req.params.id);
        const history = await Attendance.find({ studentId: req.params.id })
            .sort({ date: -1 }); // Sort by date descending
        res.json({ overall, subjects: subjectWise, history });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/teacher/today', async (req, res) => {
    const { subjectsAssigned } = req.body;
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const today = dayNames[new Date().getDay()];
    let todayClasses = [];
    
    const courses = await Course.find({});
    for (const course of courses) {
        const schedule = await generateTimetable(course.name);
        (schedule[today] || []).forEach(slot => {
            if (subjectsAssigned.includes(slot.subject)) todayClasses.push({ ...slot, course: course.name });
        });
    }
    res.json({ day: today, classes: todayClasses });
});

app.get('/api/admin/students/:course', async (req, res) => {
    const courseStudents = await User.find({ course: req.params.course, role: 'student' }).sort({ rollNumber: 1 });
    
    // Calculate stats for each student
    const studentsWithStats = await Promise.all(courseStudents.map(async (s) => {
        const stats = await calculateAttendance(s._id);
        return { ...s.toObject(), stats, id: s._id.toString() };
    }));
    
    res.json(studentsWithStats);
});

app.post('/api/admin/attendance', async (req, res) => {
    const { date, subject, courseId, period, absentRollNumbers } = req.body;
    
    try {
        // 1. Get all students for this course
        const courseStudents = await User.find({ course: courseId, role: 'student' }).sort({ _id: 1 });
        
        // 2. Parse inputs "1, 2, 3" into [1, 2, 3] (indices)
        const absentIndices = absentRollNumbers.map(r => parseInt(r.trim()));

        // 3. Save Attendance
        // We use a bulk operation or simple loop. For simplicity in this context, we loop.
        // We use findOneAndUpdate with upsert to handle duplicates cleanly.
        const promises = courseStudents.map(async (student, index) => {
            const isAbsent = absentIndices.includes(index + 1); // +1 because list is 0-based but input is 1-based
            const status = isAbsent ? 'absent' : 'present';

            await Attendance.findOneAndUpdate(
                { studentId: student._id, date: date, subject: subject, period: period },
                { status: status },
                { upsert: true, new: true }
            );
        });

        await Promise.all(promises);
        
        console.log(`Attendance Saved: ${courseId}`);
        res.json({ success: true, message: "Attendance Updated Successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Error saving attendance" });
    }
});

app.get('/api/admin/shortage/:course', async (req, res) => {
    const courseStudents = await User.find({ course: req.params.course, role: 'student' });
    
    const shortageList = [];
    for (const s of courseStudents) {
        const stats = await calculateAttendance(s._id);
        if (stats.total > 0 && stats.semesterPercentage < 75) {
            shortageList.push({ ...s.toObject(), stats, id: s._id.toString() });
        }
    }
    res.json(shortageList);
});

app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));
