const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
// Serve files from current folder
app.use(express.static(path.join(__dirname, 'frontend')));

// Cache Control
app.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    next();
});

// --- DATABASE (In-Memory) ---
const users = [
    { id: 1, username: "admin", password: "admin123", role: "admin", name: "System Admin" },
    { id: 50, username: "teacher1", password: "teacher123", role: "teacher", name: "Mr. Anil Kumar", subjects: ["Java Programming", "Data Structures"] },
    { id: 51, username: "teacher2", password: "teacher123", role: "teacher", name: "Ms. Sunita Singh", subjects: ["Business Studies", "Marketing Mgmt"] },
    { id: 101, username: "student1", password: "123", role: "student", name: "Rahul Sharma", course: "BCA", rollNumber: "BCA-01", email: "rahul@college.edu", mobile: "9876543210", semester: 3 },
    { id: 102, username: "student2", password: "123", role: "student", name: "Priya Singh", course: "BCA", rollNumber: "BCA-02", email: "priya@college.edu", mobile: "9876543211", semester: 3 },
    { id: 103, username: "student3", password: "123", role: "student", name: "Amit Verma", course: "BBA", rollNumber: "BBA-01", email: "amit@college.edu", mobile: "9876543212", semester: 3 },
    { id: 104, username: "student4", password: "123", role: "student", name: "Sneha Kapoor", course: "BBA", rollNumber: "BBA-02", email: "sneha@college.edu", mobile: "9876543213", semester: 3 },
    { id: 105, username: "student5", password: "123", role: "student", name: "Vijay Kumar", course: "BCOM", rollNumber: "BCOM-01", email: "vijay@college.edu", mobile: "9876543214", semester: 3 }
];

const subjects = {
    "BCA": ["Java Programming", "Data Structures", "DBMS", "Computer Networks", "Operating Systems"],
    "BBA": ["Business Studies", "Marketing Mgmt", "HR Management", "Business Law", "Business Ethics"],
    "BCOM": ["Accounting", "Economics", "Taxation", "Business Stats", "Banking"]
};

let attendanceRecords = []; 

// --- HELPERS ---
function generateTimetable(course) {
    const subs = subjects[course] || [];
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

function calculateAttendance(studentId) {
    const records = attendanceRecords.filter(r => r.studentId == studentId);
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

function calculateSubjectAttendance(studentId) {
    const records = attendanceRecords.filter(r => r.studentId == studentId);
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

// --- ROUTES ---
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const user = users.find(u => u.username === username && u.password === password);
    if (user) {
        const { password, ...safeUser } = user;
        res.json({ success: true, user: safeUser });
    } else {
        res.status(401).json({ success: false, message: "Invalid Credentials" });
    }
});

app.get('/api/student/subjects/:course', (req, res) => res.json(subjects[req.params.course] || []));
app.get('/api/student/timetable/:course', (req, res) => res.json(generateTimetable(req.params.course)));

// Returns history for Daily Log
app.get('/api/student/attendance/:id', (req, res) => {
    const overall = calculateAttendance(req.params.id);
    const subjectWise = calculateSubjectAttendance(req.params.id);
    const history = attendanceRecords
        .filter(r => r.studentId == req.params.id)
        .sort((a, b) => new Date(b.date) - new Date(a.date));
    res.json({ overall, subjects: subjectWise, history });
});

app.post('/api/teacher/today', (req, res) => {
    const { subjectsAssigned } = req.body;
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const today = dayNames[new Date().getDay()];
    let todayClasses = [];
    ["BCA", "BBA", "BCOM"].forEach(course => {
        const schedule = generateTimetable(course);
        (schedule[today] || []).forEach(slot => {
            if (subjectsAssigned.includes(slot.subject)) todayClasses.push({ ...slot, course });
        });
    });
    res.json({ day: today, classes: todayClasses });
});

app.get('/api/admin/students/:course', (req, res) => {
    const courseStudents = users.filter(u => u.course === req.params.course && u.role === 'student');
    res.json(courseStudents.map(s => ({ ...s, stats: calculateAttendance(s.id) })));
});

// UPDATED: Maps input numbers (1, 2, 3) to the student list index
app.post('/api/admin/attendance', (req, res) => {
    const { date, subject, courseId, period, absentRollNumbers } = req.body;
    const courseStudents = users.filter(u => u.course === courseId && u.role === 'student');
    
    // Sort students by ID to ensure 1 is always the same person
    courseStudents.sort((a, b) => a.id - b.id);

    // Parse inputs "1, 2, 3" into [1, 2, 3]
    const absentIndices = absentRollNumbers.map(r => parseInt(r.trim()));

    courseStudents.forEach((student, index) => {
        // Check if (index + 1) is in the list of absent numbers
        const isAbsent = absentIndices.includes(index + 1);
        const status = isAbsent ? 'absent' : 'present';
        
        attendanceRecords = attendanceRecords.filter(r => !(r.studentId === student.id && r.date === date && r.subject === subject && r.period == period));
        attendanceRecords.push({ studentId: student.id, date, subject, period, status });
    });
    
    console.log(`Attendance Saved: ${courseId}`);
    res.json({ success: true, message: "Attendance Updated Successfully" });
});

app.get('/api/admin/shortage/:course', (req, res) => {
    const courseStudents = users.filter(u => u.course === req.params.course && u.role === 'student');
    const shortageList = courseStudents.filter(s => {
        const stats = calculateAttendance(s.id);
        return stats.total > 0 && stats.semesterPercentage < 75;
    }).map(s => ({ ...s, stats: calculateAttendance(s.id) }));
    res.json(shortageList);
});

app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));