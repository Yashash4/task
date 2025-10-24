// auth.js
(function () {
  const supabase = SUPABASE.client();
  const $ = (id) => document.getElementById(id);

  // Show a temporary message
  function showToast(message, isError = false) {
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.className = isError ? 'toast error' : 'toast';
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.remove();
    }, 4000); // Increased duration for errors
  }

  async function handleSignup(ev) {
    ev.preventDefault();
    const username = ($("username")?.value || "").trim();
    const email = ($("email")?.value || "").trim();
    const password = ($("password")?.value || "").trim();
    const role = ($("role")?.value || "user").trim();
    const roomCode = ($("roomCode")?.value || "").trim();

    if (!username || !email || !password) return showToast("All fields are required.", true);
    if (role === 'user' && !roomCode) return showToast("Users must provide a room code.", true);

    try {
      const { data: authData, error: authErr } = await supabase.auth.signUp({ email, password });
      if (authErr) throw authErr;

      const user = authData.user;
      if (!user) throw new Error("Signup failed to return a user.");

      let profileData = { id: user.id, username, email };
      if (role === 'admin') {
        profileData.approved = true;
        profileData.role_flags = ['admin'];
      } else {
        const { data: room, error: roomErr } = await supabase.from('rooms').select('id').eq('current_code', roomCode).single();
        if (roomErr || !room) {
          throw new Error("Invalid or non-existent Room Code.");
        }
        profileData.room_id = room.id;
        profileData.approved = false;
        profileData.role_flags = ['user'];
      }

      const { error: insertErr } = await supabase.from('users_info').insert([profileData]);
      if (insertErr) {
          console.error("DATABASE INSERT FAILED:", insertErr);
          throw new Error(`Database error: ${insertErr.message}`);
      }

      showToast(role === 'admin' ? "Admin account created successfully!" : "Account created! Pending approval.");
      setTimeout(() => window.location.href = 'login.html', 1000);

    } catch (err) {
      console.error("Signup Error:", err);
      showToast(err.message, true);
    }
  }

  async function handleLogin(ev) {
    ev.preventDefault();
    const email = ($("email")?.value || "").trim();
    const password = ($("password")?.value || "").trim();
    if (!email || !password) return showToast("Email and password are required.", true);

    try {
      const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({ email, password });
      if (authErr) throw authErr;

      const user = authData.user;
      if (!user) throw new Error("Login failed to return a user session.");
      
      const { data: profile, error: profileErr } = await supabase.from('users_info').select('*').eq('id', user.id).single();
      if (profileErr) throw new Error("Could not fetch your user profile.");

      if (!profile.approved) {
        await supabase.auth.signOut();
        return showToast("Your account is pending admin approval.", true);
      }
      
      showToast("Login successful! Redirecting...");
      setTimeout(() => {
          window.location.href = profile.role_flags.includes('admin') ? 'admin/dashboard.html' : 'user/dashboard.html';
      }, 500);

    } catch (err) {
        console.error("Login Error:", err);
        showToast(err.message, true);
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    $("signupForm")?.addEventListener("submit", handleSignup);
    $("loginForm")?.addEventListener("submit", handleLogin);
  });
})();