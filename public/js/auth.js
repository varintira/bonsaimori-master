// ================= 0. ป้องกันการเข้าหน้าเว็บก่อน Sign In + แสดงแถบแจ้งเตือน =================
const currentPage = window.location.pathname.split("/").pop();
const publicPages = ["signin.html", "signup.html", "forgot_password.html", "repassword.html"];

// 1) ถ้าอยู่หน้าอื่นที่ต้องล็อกอิน แต่ยังไม่ผ่านการ Sign In -> ดีดกลับพร้อมแนบข้อความใน URL
if (!publicPages.includes(currentPage) && sessionStorage.getItem("isLoggedIn") !== "true") {
    window.location.replace("signin.html?msg=login_required");
}

// 2) ถ้าเด้งกลับมาหน้า signin.html พร้อม ?msg=login_required -> โชว์แถบแจ้งเตือนสวยๆ บนฟอร์ม
if (currentPage === "signin.html") {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("msg") === "login_required") {
        const alertBox = document.getElementById("authAlertBox");
        if (alertBox) {
            alertBox.innerHTML = `
                <div class="alert alert-warning alert-dismissible fade show small mb-4" role="alert">
                    <strong>Access Denied:</strong> Please sign in first to access that page.
                    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                </div>
            `;
            // ล้าง ?msg=login_required ออกจากแถบ URL เพื่อความสวยงามเวลารีเฟรช
            window.history.replaceState({}, document.title, "signin.html");
        }
    }
}



// ฟังก์ชันตรวจสอบเงื่อนไขรหัสผ่านฝั่งหน้าเว็บ
function checkPasswordValid(password) {
    if (password.length < 8) {
        return "รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร";
    }
    if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
        return "รหัสผ่านต้องมีทั้งตัวอักษรภาษาอังกฤษและตัวเลขผสมกัน";
    }
    return null;
}

// 1. จัดการหน้า Sign In
const signinForm = document.getElementById("signinForm");
if (signinForm) {
    signinForm.addEventListener("submit", async function(event) {
        event.preventDefault();
        
        const email = document.getElementById("signinEmail").value;
        const password = document.getElementById("signinPassword").value;

        const response = await fetch("/api/signin", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {
            sessionStorage.setItem("isLoggedIn", "true");
            alert(data.message);
            window.location.href = "index.html";
        } else {
            alert(data.message);
        }
    });
}

// 2. จัดการหน้า Sign Up
const signupForm = document.getElementById("signupForm");
if (signupForm) {
    signupForm.addEventListener("submit", async function(event) {
        event.preventDefault();
        
        const name = document.getElementById("signupName").value;
        const email = document.getElementById("signupEmail").value;
        const password = document.getElementById("signupPassword").value;
        const confirmPassword = document.getElementById("signupConfirmPassword").value;

        // เช็กความยาวและรูปแบบรหัสผ่าน
        const passwordError = checkPasswordValid(password);
        if (passwordError) {
            alert(passwordError);
            return;
        }

        if (password !== confirmPassword) {
            alert("รหัสผ่านทั้ง 2 ช่องไม่ตรงกัน กรุณากรอกใหม่");
            return;
        }

        const response = await fetch("/api/signup", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, email, password })
        });

        const data = await response.json();

        if (response.ok) {
            alert(data.message);
            window.location.href = "signin.html";
        } else {
            alert(data.message);
        }
    });
}

// 3. จัดการหน้า Forgot Password (ส่งลิงก์ไปที่อีเมล)
const forgotPasswordForm = document.getElementById("forgotPasswordForm");
if (forgotPasswordForm) {
    forgotPasswordForm.addEventListener("submit", async function(event) {
        event.preventDefault();

        const email = document.getElementById("forgotEmail").value;
        const btn = document.getElementById("forgotBtn");
        btn.disabled = true;
        btn.textContent = "Sending...";

        const response = await fetch("/api/forgot-password", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email })
        });

        const data = await response.json();
        btn.disabled = false;
        btn.textContent = "Send Reset Link";

        alert(data.message);
        if (response.ok) {
            window.location.href = "signin.html";
        }
    });
}

// 4. จัดการหน้า Reset Password (ตั้งรหัสผ่านใหม่จาก Token)
const resetPasswordForm = document.getElementById("resetPasswordForm");
if (resetPasswordForm) {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get("token");

    if (!token) {
        alert("ไม่พบลิงก์ยืนยันตัวตน กรุณาทำรายการลืมรหัสผ่านใหม่อีกครั้ง");
        window.location.href = "forgot_password.html";
    }

    resetPasswordForm.addEventListener("submit", async function(event) {
        event.preventDefault();

        const newPassword = document.getElementById("newPassword").value;
        const confirmNewPassword = document.getElementById("confirmNewPassword").value;

        const passwordError = checkPasswordValid(newPassword);
        if (passwordError) {
            alert(passwordError);
            return;
        }

        if (newPassword !== confirmNewPassword) {
            alert("รหัสผ่านใหม่ทั้ง 2 ช่องไม่ตรงกัน");
            return;
        }

        const response = await fetch("/api/reset-password", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token, newPassword })
        });

        const data = await response.json();
        alert(data.message);

        if (response.ok) {
            window.location.href = "signin.html";
        }
    });
}

// 5. ฟังก์ชัน Logout
async function logout() {
    await fetch("/api/logout", { method: "POST" });
    sessionStorage.removeItem("isLoggedIn");
    window.location.href = "signin.html";
}