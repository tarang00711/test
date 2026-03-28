// Check if JS is connected
console.log("JS connected successfully");

// Check if user is logged in (only for index.html)
function checkAuth() {
    if (window.location.pathname.includes("index.html") || window.location.pathname.endsWith("/")) {
        let isLoggedIn = sessionStorage.getItem("isLoggedIn");
        if (!isLoggedIn) {
            window.location.href = "login.html";
        }
    }
}

// Dark mode toggle
function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    document.getElementById('darkModeToggle').innerText = theme === 'dark' ? '☀️' : '🌙';
}

function applyTheme() {
    let storedTheme = localStorage.getItem('theme') || 'light';
    setTheme(storedTheme);
}

function toggleDarkMode() {
    let current = document.documentElement.getAttribute('data-theme') || 'light';
    setTheme(current === 'light' ? 'dark' : 'light');
}

// Switch between tabs
function switchTab(tab) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));

    document.getElementById(tab + 'Section').classList.add('active');
    const activeTabBtn = document.querySelector(`.tab-btn[data-tab="${tab}"]`);
    if (activeTabBtn) activeTabBtn.classList.add('active');

    if (tab === 'attendance') {
        renderAttendance();
        updateAttendanceDate();
    } else if (tab === 'students') {
        render();
    }
}

// Update attendance date display
function updateAttendanceDate() {
    let today = new Date();
    let dateStr = today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    document.getElementById('attendanceDate').innerText = dateStr;
}

// Get today's date in YYYY-MM-DD format
function getToday() {
    let today = new Date();
    return today.toISOString().split('T')[0];
}

// Calculate attendance percentage for a student
function getAttendancePercentage(studentIndex) {
    if (!students[studentIndex].attendance || students[studentIndex].attendance.length === 0) {
        return 0;
    }
    
    let records = students[studentIndex].attendance;
    let presentCount = records.filter(r => r.status === 'present').length;
    let total = records.length;
    
    return total > 0 ? Math.round((presentCount / total) * 100) : 0;
}

// Calculate CGPA from student marks for a student (max 5 subjects)
function getCgpa(studentIndex) {
    let marksArray = (students[studentIndex].marks || []).slice(0, 5);

    if (marksArray.length === 0) {
        return "0.00";
    }

    let total = marksArray.reduce((acc, m) => acc + Number(m.marks), 0);

    // CGPA out of 10 for 5 subjects; missing subjects count as 0
    let denominator = 5;
    let avg = total / denominator;
    let cgpa = (avg / 10).toFixed(2);
    return cgpa;
}

function populateStudentSelect() {
    let select = document.getElementById('studentSelect');
    select.innerHTML = '<option value="">Select Student</option>';
    students.forEach((student, index) => {
        select.innerHTML += `<option value="${index}">${student.name} (${student.roll})</option>`;
    });
    updateAddMarksButton();
}

function addMarksForStudent() {
    let idx = document.getElementById('studentSelect').value;
    let subject = document.getElementById('subject').value.trim();
    let marks = Number(document.getElementById('marks').value);

    if (idx === '' || !subject || isNaN(marks) || marks < 0 || marks > 100) {
        showToast('Fill student, subject and valid marks (0-100)');
        return;
    }

    if (!students[idx].marks) {
        students[idx].marks = [];
    }

    if (students[idx].marks.length >= 5) {
        showToast('Maximum 5 subjects allowed per student');
        updateAddMarksButton();
        return;
    }

    students[idx].marks.push({ subject, marks });
    saveData();

    document.getElementById('subject').value = '';
    document.getElementById('marks').value = '';

    updateAddMarksButton();
    renderMarks();
    render();
    showToast('✅ Marks added');
}

function deleteMark(studentIndex, markIndex) {
    if (!students[studentIndex].marks) { return; }
    students[studentIndex].marks.splice(markIndex, 1);
    saveData();
    renderMarks();
    render();
    updateAddMarksButton();
}

function renderMarks() {
    let body = document.getElementById('marksBody');
    body.innerHTML = '';

    students.forEach((student, sIndex) => {
        let marks = student.marks || [];
        marks.forEach((mark, mIndex) => {
            body.innerHTML += `
                <tr>
                    <td>${student.name}</td>
                    <td>${mark.subject}</td>
                    <td>${mark.marks}</td>
                    <td>
                        <button class="action-btn delete" onclick="deleteMark(${sIndex}, ${mIndex})">Delete</button>
                    </td>
                </tr>
            `;
        });
    });
    updateAddMarksButton();
}


// Mark present
function markPresent(index) {
    let today = getToday();
    if (!students[index].attendance) {
        students[index].attendance = [];
    }
    
    let existingRecord = students[index].attendance.find(r => r.date === today);
    if (existingRecord) {
        existingRecord.status = 'present';
    } else {
        students[index].attendance.push({ date: today, status: 'present' });
    }
    
    saveData();
    renderAttendance();
    showToast("✅ Marked present!");
}

// Mark absent
function markAbsent(index) {
    let today = getToday();
    if (!students[index].attendance) {
        students[index].attendance = [];
    }
    
    let existingRecord = students[index].attendance.find(r => r.date === today);
    if (existingRecord) {
        existingRecord.status = 'absent';
    } else {
        students[index].attendance.push({ date: today, status: 'absent' });
    }
    
    saveData();
    renderAttendance();
    showToast("❌ Marked absent!");
}

// Mark all present
function markAllPresent() {
    let today = getToday();
    students.forEach((student, index) => {
        if (!student.attendance) {
            student.attendance = [];
        }
        
        let existingRecord = student.attendance.find(r => r.date === today);
        if (!existingRecord) {
            student.attendance.push({ date: today, status: 'present' });
        }
    });
    
    saveData();
    renderAttendance();
    showToast("✅ All students marked present!");
}

// Render attendance section
function renderAttendance() {
    let tbody = document.getElementById("attendanceBody");
    tbody.innerHTML = "";
    
    let today = getToday();
    
    students.forEach((student, index) => {
        let todayRecord = student.attendance && student.attendance.find(r => r.date === today);
        let status = todayRecord ? todayRecord.status : 'unmarked';
        let statusDisplay = status === 'present' ? '✅ Present' : status === 'absent' ? '❌ Absent' : '⭕ Not Marked';
        let statusColor = status === 'present' ? 'present' : status === 'absent' ? 'absent' : 'unmarked';
        
        tbody.innerHTML += `
            <tr>
                <td>${student.roll}</td>
                <td>${student.name}</td>
                <td><span class="status ${statusColor}">${statusDisplay}</span></td>
                <td>
                    <button class="action-btn edit" onclick="markPresent(${index})">Present</button>
                    <button class="action-btn delete" onclick="markAbsent(${index})">Absent</button>
                </td>
            </tr>
        `;
    });
}

// Handle login
function handleLogin(event) {
    event.preventDefault();
    
    let username = document.getElementById("username").value.trim();
    let password = document.getElementById("password").value;
    let errorDiv = document.getElementById("error");
    
    // Simple credentials (you can modify these)
    const validCredentials = {
        "admin": "1234",
        "teacher": "password123"
    };
    
    if (validCredentials[username] && validCredentials[username] === password) {
        sessionStorage.setItem("isLoggedIn", "true");
        sessionStorage.setItem("username", username);
        window.location.href = "index.html";
    } else {
        errorDiv.innerText = "❌ Invalid username or password";
        errorDiv.style.display = "block";
    }
}

// Handle logout
function handleLogout() {
    if (confirm("Are you sure you want to logout?")) {
        sessionStorage.removeItem("isLoggedIn");
        sessionStorage.removeItem("username");
        window.location.href = "login.html";
    }
}

// Run auth check on page load
checkAuth();

function showToast(msg) {
    let toast = document.getElementById("toast");
    toast.innerText = msg;
    toast.classList.add("show");

    setTimeout(() => {
        toast.classList.remove("show");
    }, 2000);
}

// Load from localStorage
let students = JSON.parse(localStorage.getItem("students")) || [];
let editIndex = -1;

// Validate email format
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Validate phone number format
function isValidPhone(phone) {
    const phoneRegex = /^[\d\s\-\+\(\)]{10,}$/;
    return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10;
}

// Add or Update Student
function addStudent() {
    let name = document.getElementById("name").value.trim();
    let roll = document.getElementById("roll").value.trim();
    let course = document.getElementById("course").value.trim();
    let age = document.getElementById("age").value.trim();
    let email = document.getElementById("email").value.trim();
    let phone = document.getElementById("phone").value.trim();

    if (!name || !roll || !course || !age || !email || !phone) {
        showToast("Fill all fields!");
        return;
    }

    // Validate email
    if (!isValidEmail(email)) {
        showToast("❌ Invalid email format!");
        return;
    }

    // Validate phone
    if (!isValidPhone(phone)) {
        showToast("❌ Phone must be 10+ digits!");
        return;
    }

    // Check duplicate roll
    let duplicate = students.find((s, i) => s.roll === roll && i !== editIndex);
    if (duplicate) {
        alert("Roll number already exists!");
        return;
    }

    if (editIndex === -1) {
        let now = new Date();
        let date = now.toLocaleDateString();
        let time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        let dateTime = `${date}, ${time}`;
        students.push({ name, roll, course, age, email, phone, date: dateTime, attendance: [] });
        showToast("✅ Student added successfully!");
    } else {
        students[editIndex] = { name, roll, course, age, email, phone, date: students[editIndex].date, attendance: students[editIndex].attendance || [] };
        editIndex = -1;
        showToast("✅ Student updated successfully!");
    }

    saveData();
    clearForm();
}

// Render students in table
function render() {
    let search = document.getElementById("search").value.toLowerCase();
    let tbody = document.getElementById("tableBody");

    tbody.innerHTML = "";

    let filtered = students.map((s, index) => ({ student: s, index: index })).filter(obj =>
        obj.student.name.toLowerCase().includes(search) ||
        obj.student.roll.includes(search) ||
        obj.student.email.includes(search)
    );

    filtered.forEach((obj) => {
        let student = obj.student;
        let index = obj.index;
        let attendancePercent = getAttendancePercentage(index);
        let cgpa = getCgpa(index);
        let attendanceColor = attendancePercent >= 75 ? '#28a745' : attendancePercent >= 50 ? '#ffc107' : '#dc3545';
        
        tbody.innerHTML += `
            <tr>
                <td>${student.name}</td>
                <td>${student.roll}</td>
                <td>${student.course}</td>
                <td>${student.age}</td>
                <td>${student.email}</td>
                <td>${student.phone}</td>
                <td style="color: ${attendanceColor}; font-weight: bold;">${attendancePercent}%</td>
                <td>${cgpa}</td>
                <td>${student.date}</td>
                <td>
                    <button class="action-btn edit" onclick="editStudent(${index})">Edit</button>
                    <button class="action-btn delete" onclick="deleteStudent(${index})">Delete</button>
                </td>
            </tr>
        `;
    });

    document.getElementById("count").innerText = students.length;
    populateStudentSelect();
}

// Delete student
function deleteStudent(index) {
    if (confirm("Are you sure you want to delete this student?")) {
        students.splice(index, 1);
        saveData();
    }
}

// Edit student
function editStudent(index) {
    document.getElementById("name").value = students[index].name;
    document.getElementById("roll").value = students[index].roll;
    document.getElementById("course").value = students[index].course;
    document.getElementById("age").value = students[index].age;
    document.getElementById("email").value = students[index].email;
    document.getElementById("phone").value = students[index].phone;
    editIndex = index;
    window.scrollTo(0, 0);
}

// Sort A-Z
function sortStudents() {
    students.sort((a, b) => a.name.localeCompare(b.name));
    saveData();
}

function updateAddMarksButton() {
    let idx = document.getElementById('studentSelect')?.value;
    let button = document.getElementById('addMarksBtn');
    if (!button) return;

    if (idx === '' || idx === null) {
        button.disabled = true;
        button.innerText = 'Add Marks';
        return;
    }

    let marks = (students[idx]?.marks || []).length;
    button.disabled = marks >= 5;
    button.innerText = marks >= 5 ? 'Max 5 Reached' : 'Add Marks';
}

// Save to localStorage
function saveData() {
    localStorage.setItem("students", JSON.stringify(students));
    render();
}

// Clear form
function clearForm() {
    document.getElementById("name").value = "";
    document.getElementById("roll").value = "";
    document.getElementById("course").value = "";
    document.getElementById("age").value = "";
    document.getElementById("email").value = "";
    document.getElementById("phone").value = "";
}

// Initial render
applyTheme();
switchTab('students');
populateStudentSelect();
renderMarks();

function exportCSV() {
    let csv = "Name,Roll,Class,Age,Email,Phone,Date\n";

    students.forEach(s => {
        let cgpa = getCgpa(students.indexOf(s));
        csv += `${s.name},${s.roll},${s.course},${s.age},${s.email},${s.phone},${s.attendance?.length||0},${cgpa},${s.date}\n`;
    });

    let blob = new Blob([csv], { type: "text/csv" });
    let a = document.createElement("a");

    a.href = URL.createObjectURL(blob);
    a.download = "students.csv";
    a.click();
}