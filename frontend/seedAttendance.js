const mongoose = require('mongoose');

// 1. Connect to MongoDB
const MONGO_URI = 'mongodb://127.0.0.1:27017/uniportal_db';
mongoose.connect(MONGO_URI)
    .then(() => console.log('✅ Connected to MongoDB for Seeding...'))
    .catch(err => console.error('❌ Error:', err));

// 2. Define Schemas (Must match server.js exactly)
const userSchema = new mongoose.Schema({
    username: String, password: String, role: String, name: String,
    course: String, rollNumber: String, email: String, mobile: String, semester: Number,
    subjects: [String]
});

const attendanceSchema = new mongoose.Schema({
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    date: String,
    subject: String,
    period: Number,
    status: { type: String, enum: ['present', 'absent'] }
});

const User = mongoose.model('User', userSchema);
const Attendance = mongoose.model('Attendance', attendanceSchema);

// 3. Helper to format date YYYY-MM-DD
function formatDate(date) {
    return date.toISOString().split('T')[0];
}

// 4. Main Seeding Function
async function seedAttendance() {
    try {
        const students = await User.find({ role: 'student' });
        console.log(`Found ${students.length} students. Generating records...`);

        // Clear old attendance first (optional)
        await Attendance.deleteMany({});
        console.log("Cleared old attendance data.");

        const subjectsByCourse = {
            "BCA": ["Java Programming", "Data Structures", "DBMS", "Computer Networks", "Operating Systems"],
            "BBA": ["Business Studies", "Marketing Mgmt", "HR Management", "Business Law", "Business Ethics"],
            "BCOM": ["Accounting", "Economics", "Taxation", "Business Stats", "Banking"]
        };

        const recordsToInsert = [];
        const today = new Date();

        // Loop through the last 30 days
        for (let i = 0; i < 30; i++) {
            const currentDate = new Date(today);
            currentDate.setDate(today.getDate() - i);
            const dayOfWeek = currentDate.getDay(); // 0 = Sunday, 6 = Saturday

            // Skip Sundays (optional)
            if (dayOfWeek === 0) continue; 

            const dateString = formatDate(currentDate);

            // Generate records for each student for this day
            for (const student of students) {
                const courseSubjects = subjectsByCourse[student.course] || ["General"];
                
                // Pick a random subject for this day
                const randomSubject = courseSubjects[Math.floor(Math.random() * courseSubjects.length)];
                
                // Random Period (1 to 4)
                const randomPeriod = Math.floor(Math.random() * 4) + 1;

                // 80% chance to be Present, 20% Absent
                const status = Math.random() > 0.2 ? 'present' : 'absent';

                recordsToInsert.push({
                    studentId: student._id,
                    date: dateString,
                    subject: randomSubject,
                    period: randomPeriod,
                    status: status
                });
            }
        }

        // Insert into Database
        await Attendance.insertMany(recordsToInsert);
        console.log(`✅ Successfully inserted ${recordsToInsert.length} attendance records!`);
        
        process.exit(); // Stop script

    } catch (err) {
        console.error("❌ Seeding failed:", err);
        process.exit(1);
    }
}

// Run the seed
seedAttendance();
