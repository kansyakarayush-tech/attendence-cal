import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { 
    getAuth, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged 
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { 
    getFirestore, 
    doc, 
    setDoc, 
    getDoc, 
    collection, 
    getDocs, 
    deleteDoc 
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

const firebaseConfig = {
    apiKey: "YOUR-API-KEY",
    authDomain: "YOUR-PROJECT.firebaseapp.com",
    projectId: "YOUR-PROJECT-ID",
    storageBucket: "YOUR-PROJECT.appspot.com",
    messagingSenderId: "YOUR-SENDER-ID",
    appId: "YOUR-APP-ID"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentUser = null;
let isSignupMode = false;

onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        if (window.location.pathname.includes('index.html') || window.location.pathname === '/') {
            window.location.href = 'dashboard.html';
        } else if (window.location.pathname.includes('dashboard.html')) {
            loadUserProfile();
        }
    } else {
        currentUser = null;
        if (window.location.pathname.includes('dashboard.html')) {
            window.location.href = 'index.html';
        }
    }
});

if (window.location.pathname.includes('index.html') || window.location.pathname === '/') {
    const authForm = document.getElementById('authForm');
    const toggleAuthMode = document.getElementById('toggleAuthMode');
    const authBtn = document.getElementById('authBtn');
    const btnText = document.getElementById('btnText');
    const btnIcon = document.getElementById('btnIcon');
    const spinner = document.getElementById('spinner');
    const errorMessage = document.getElementById('errorMessage');
    const profileFields = document.getElementById('profileFields');

    toggleAuthMode.addEventListener('click', () => {
        isSignupMode = !isSignupMode;
        if (isSignupMode) {
            btnText.textContent = 'Sign Up';
            toggleAuthMode.textContent = 'Already have an account? Login';
            profileFields.style.display = 'block';
            document.getElementById('studentName').required = true;
            document.getElementById('collegeName').required = true;
            document.getElementById('branch').required = true;
            document.getElementById('semester').required = true;
        } else {
            btnText.textContent = 'Login';
            toggleAuthMode.textContent = "Don't have an account? Sign Up";
            profileFields.style.display = 'none';
            document.getElementById('studentName').required = false;
            document.getElementById('collegeName').required = false;
            document.getElementById('branch').required = false;
            document.getElementById('semester').required = false;
        }
        errorMessage.textContent = '';
    });

    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;

        btnText.style.display = 'none';
        btnIcon.style.display = 'none';
        spinner.style.display = 'inline-block';
        authBtn.disabled = true;
        errorMessage.textContent = '';

        try {
            if (isSignupMode) {
                const name = document.getElementById('studentName').value.trim();
                const college = document.getElementById('collegeName').value.trim();
                const branch = document.getElementById('branch').value.trim();
                const semester = document.getElementById('semester').value;

                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;

                await setDoc(doc(db, 'users', user.uid), {
                    profile: {
                        name,
                        college,
                        branch,
                        semester,
                        email
                    }
                });

                window.location.href = 'dashboard.html';
            } else {
                await signInWithEmailAndPassword(auth, email, password);
                window.location.href = 'dashboard.html';
            }
        } catch (error) {
            let message = 'An error occurred';
            if (error.code === 'auth/email-already-in-use') {
                message = 'Email already in use';
            } else if (error.code === 'auth/invalid-email') {
                message = 'Invalid email address';
            } else if (error.code === 'auth/user-not-found') {
                message = 'User not found';
            } else if (error.code === 'auth/wrong-password') {
                message = 'Incorrect password';
            } else if (error.code === 'auth/weak-password') {
                message = 'Password should be at least 6 characters';
            } else if (error.code === 'auth/invalid-credential') {
                message = 'Invalid email or password';
            }
            errorMessage.textContent = message;
            btnText.style.display = 'inline';
            btnIcon.style.display = 'inline';
            spinner.style.display = 'none';
            authBtn.disabled = false;
        }
    });
}

if (window.location.pathname.includes('dashboard.html')) {
    document.getElementById('logoutBtn').addEventListener('click', async () => {
        if (confirm('Are you sure you want to logout?')) {
            await signOut(auth);
        }
    });

    document.getElementById('addSubjectBtn').addEventListener('click', () => openModal());
    document.getElementById('closeModal').addEventListener('click', closeModal);
    document.getElementById('cancelBtn').addEventListener('click', closeModal);
    document.getElementById('subjectForm').addEventListener('submit', handleSubjectSubmit);

    window.addEventListener('click', (e) => {
        const modal = document.getElementById('subjectModal');
        if (e.target === modal) {
            closeModal();
        }
    });
}

async function loadUserProfile() {
    if (!currentUser) return;

    const docRef = doc(db, 'users', currentUser.uid);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        const data = docSnap.data();
        const profile = data.profile;
        
        document.getElementById('displayName').textContent = profile.name;
        document.getElementById('displaySemester').textContent = `Semester ${profile.semester}`;
        document.getElementById('displayBranch').textContent = profile.branch;
    }

    await renderSubjects();
}

async function getSubjects() {
    if (!currentUser) return [];

    const subjectsRef = collection(db, 'users', currentUser.uid, 'subjects');
    const snapshot = await getDocs(subjectsRef);
    
    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));
}

async function saveSubject(subjectData) {
    if (!currentUser) return;

    const subjectRef = doc(db, 'users', currentUser.uid, 'subjects', subjectData.id);
    await setDoc(subjectRef, {
        name: subjectData.name,
        total: subjectData.total,
        attended: subjectData.attended
    });
}

async function deleteSubjectFromDB(subjectId) {
    if (!currentUser) return;

    const subjectRef = doc(db, 'users', currentUser.uid, 'subjects', subjectId);
    await deleteDoc(subjectRef);
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function openModal(subjectId = null) {
    const modal = document.getElementById('subjectModal');
    const form = document.getElementById('subjectForm');
    const modalTitle = document.getElementById('modalTitle');

    form.reset();

    if (subjectId) {
        getSubjects().then(subjects => {
            const subject = subjects.find(s => s.id === subjectId);
            
            if (subject) {
                modalTitle.textContent = 'Edit Subject';
                document.getElementById('subjectId').value = subject.id;
                document.getElementById('subjectName').value = subject.name;
                document.getElementById('totalClasses').value = subject.total;
                document.getElementById('attendedClasses').value = subject.attended;
            }
        });
    } else {
        modalTitle.textContent = 'Add Subject';
        document.getElementById('subjectId').value = '';
    }

    modal.classList.add('active');
}

function closeModal() {
    const modal = document.getElementById('subjectModal');
    modal.classList.remove('active');
}

async function handleSubjectSubmit(e) {
    e.preventDefault();

    const subjectId = document.getElementById('subjectId').value;
    const name = document.getElementById('subjectName').value.trim();
    const total = parseInt(document.getElementById('totalClasses').value);
    const attended = parseInt(document.getElementById('attendedClasses').value);

    if (attended > total) {
        alert('Classes attended cannot be more than total classes!');
        return;
    }

    const id = subjectId || generateId();
    
    await saveSubject({ id, name, total, attended });
    closeModal();
    await renderSubjects();
}

window.deleteSubject = async function(subjectId) {
    if (confirm('Are you sure you want to delete this subject?')) {
        await deleteSubjectFromDB(subjectId);
        await renderSubjects();
    }
}

window.openModal = openModal;

window.markPresent = async function(subjectId) {
    const subjects = await getSubjects();
    const subject = subjects.find(s => s.id === subjectId);
    
    if (subject) {
        subject.total += 1;
        subject.attended += 1;
        
        await saveSubject(subject);
        await renderSubjects();
        
        showToast('✓ Marked Present', 'success');
    }
}

window.markAbsent = async function(subjectId) {
    const subjects = await getSubjects();
    const subject = subjects.find(s => s.id === subjectId);
    
    if (subject) {
        subject.total += 1;
        
        await saveSubject(subject);
        await renderSubjects();
        
        showToast('⚠ Marked Absent', 'warning');
    }
}

function showToast(message, type = 'success') {
    const existingToast = document.querySelector('.toast');
    if (existingToast) {
        existingToast.remove();
    }
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => toast.classList.add('show'), 100);
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 2000);
}

function calculateAttendance(attended, total) {
    if (total === 0) return 0;
    return (attended / total) * 100;
}

function getAttendanceStatus(percentage) {
    if (percentage >= 75) return 'safe';
    if (percentage >= 70) return 'warning';
    return 'danger';
}

function calculateBunkInfo(attended, total) {
    const currentPercentage = calculateAttendance(attended, total);
    const targetPercentage = 75;

    if (total === 0) {
        return "Start attending classes to track your attendance!";
    }

    if (currentPercentage >= targetPercentage) {
        let canBunk = 0;
        let tempAttended = attended;
        let tempTotal = total;

        while (true) {
            tempTotal++;
            const newPercentage = (tempAttended / tempTotal) * 100;
            if (newPercentage < targetPercentage) {
                break;
            }
            canBunk++;
        }

        if (canBunk === 0) {
            return "You're at exactly 75%. Can't skip any classes! 😅";
        } else if (canBunk === 1) {
            return `You can skip <strong>1 class</strong> and still be safe! 🎉`;
        } else {
            return `You're doing great! Can skip up to <strong>${canBunk} classes</strong> safely! 🔥`;
        }
    } else {
        let needToAttend = 0;
        let tempAttended = attended;
        let tempTotal = total;

        while (true) {
            tempTotal++;
            tempAttended++;
            needToAttend++;
            const newPercentage = (tempAttended / tempTotal) * 100;
            if (newPercentage >= targetPercentage) {
                break;
            }
            if (needToAttend > 100) {
                return "Attend more classes to improve your attendance!";
            }
        }

        if (needToAttend === 1) {
            return `Attend <strong>1 more class</strong> to reach 75%! 💪`;
        } else {
            return `You need to attend <strong>${needToAttend} classes</strong> continuously to reach 75%! 📚`;
        }
    }
}

async function renderSubjects() {
    const subjects = await getSubjects();
    const container = document.getElementById('subjectsContainer');
    const emptyState = document.getElementById('emptyState');

    if (subjects.length === 0) {
        container.innerHTML = '';
        emptyState.classList.add('active');
        return;
    }

    emptyState.classList.remove('active');
    
    container.innerHTML = subjects.map(subject => {
        const percentage = calculateAttendance(subject.attended, subject.total);
        const status = getAttendanceStatus(percentage);
        const bunkMessage = calculateBunkInfo(subject.attended, subject.total);

        return `
            <div class="subject-card">
                <div class="subject-header">
                    <h3 class="subject-name">${subject.name}</h3>
                    <div class="subject-actions">
                        <button class="action-btn edit-btn" onclick="openModal('${subject.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn delete-btn" onclick="deleteSubject('${subject.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>

                <div class="attendance-stats">
                    <div class="percentage-display">
                        <div class="percentage-number ${status}">${percentage.toFixed(1)}%</div>
                        <div class="attendance-label">Attendance</div>
                    </div>

                    <div class="progress-bar">
                        <div class="progress-fill ${status}" style="width: ${Math.min(percentage, 100)}%"></div>
                    </div>

                    <div class="class-info">
                        <div class="info-item">
                            <div class="info-value">${subject.attended}</div>
                            <div class="info-label">Attended</div>
                        </div>
                        <div class="info-item">
                            <div class="info-value">${subject.total}</div>
                            <div class="info-label">Total</div>
                        </div>
                        <div class="info-item">
                            <div class="info-value">${subject.total - subject.attended}</div>
                            <div class="info-label">Missed</div>
                        </div>
                    </div>

                    <div class="bunk-calculator">
                        <div class="bunk-title">
                            <i class="fas fa-calculator"></i>
                            Bunk Calculator
                        </div>
                        <div class="bunk-message">${bunkMessage}</div>
                    </div>

                    <div class="quick-actions">
                        <button class="quick-btn present-btn" onclick="markPresent('${subject.id}')">
                            <i class="fas fa-check"></i>
                            Mark Present
                        </button>
                        <button class="quick-btn absent-btn" onclick="markAbsent('${subject.id}')">
                            <i class="fas fa-times"></i>
                            Mark Absent
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}