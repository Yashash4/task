// admin-dashboard.js
(async function () {
    const supabase = SUPABASE.client();
    const $ = (id) => document.getElementById(id);

    async function getProfile() {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            window.location.href = '../login.html';
            return null;
        }
        
        const { data: profile, error } = await supabase.from('users_info').select('*').eq('id', user.id).single();
        if (error || !profile?.role_flags?.includes('admin')) { 
            await supabase.auth.signOut();
            window.location.href = '../login.html'; 
            return null; 
        }
        return profile;
    }

    async function loadDashboard() {
        const profile = await getProfile();
        if (!profile) return;

        const container = $('dashboard-content');
        container.innerHTML = ` 
            <h3>Welcome, ${profile.username}!</h3>
            <p>This is your central hub for managing tasks, users, and rooms.</p>
        `;
    }

    $('logoutBtn')?.addEventListener('click', async (e) => {
        e.preventDefault();
        await supabase.auth.signOut();
        window.location.href = '../login.html';
    });

    document.addEventListener('DOMContentLoaded', loadDashboard);
})();