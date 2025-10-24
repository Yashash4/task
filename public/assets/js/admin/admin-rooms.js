// admin-rooms.js
(async function () {
    const supabase = SUPABASE.client();
    const $ = (id) => document.getElementById(id);

    function showToast(message, isError = false) {
        const toast = document.createElement('div');
        toast.textContent = message;
        toast.className = isError ? 'toast error' : 'toast';
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }

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

    async function loadRooms() {
        const profile = await getProfile();
        if (!profile) return;

        const { data: rooms, error } = await supabase
            .from('rooms')
            .select('*')
            .eq('created_by', profile.id)
            .order('created_at', { ascending: false });

        const container = $('roomsList');
        if (error || !rooms || rooms.length === 0) {
            container.innerHTML = '<p style="color: var(--mut);">No rooms created yet.</p>';
            return;
        }

        container.innerHTML = rooms.map(room => `
            <div style="background: var(--elev); padding: 1rem; border-radius: 8px; margin-bottom: 1rem;">
                <div style="display: flex; justify-content: space-between; align-items: start;">
                    <div>
                        <h3 style="margin: 0 0 0.5rem 0;">${room.name}</h3>
                        <div style="display: flex; align-items: center; gap: 1rem;">
                            <span class="mono" style="color: var(--brand); font-size: 1.2rem; font-weight: 700;">${room.current_code}</span>
                            <button onclick="copyCode('${room.current_code}')" class="btn secondary" style="padding: 6px 12px; font-size: 0.85rem;">Copy Code</button>
                        </div>
                        <p style="margin: 0.5rem 0 0 0; font-size: 0.85rem; color: var(--mut);">
                            Share this code with users to join this room
                        </p>
                    </div>
                </div>
            </div>
        `).join('');
    }

    // Global function for copying code
    window.copyCode = async (code) => {
        try {
            await navigator.clipboard.writeText(code);
            showToast(`Room code ${code} copied!`);
        } catch (err) {
            showToast('Failed to copy code', true);
        }
    };

    async function handleCreateRoom(ev) {
        ev.preventDefault();
        const name = $('roomName').value.trim();
        if (!name) return showToast('Room name is required', true);

        const profile = await getProfile();
        if (!profile) return;

        try {
            // Generate room code
            const { data: codeData, error: codeError } = await supabase.rpc('generate_room_code');
            if (codeError) throw codeError;
            
            const roomCode = codeData;

            // Create room
            const { data: room, error } = await supabase
                .from('rooms')
                .insert([{
                    name,
                    current_code: roomCode,
                    created_by: profile.id
                }])
                .select()
                .single();

            if (error) throw error;

            // Update admin's room_id
            const { error: updateError } = await supabase
                .from('users_info')
                .update({ room_id: room.id })
                .eq('id', profile.id);

            if (updateError) console.error('Failed to update admin room_id:', updateError);

            showToast('Room created successfully!');
            $('roomName').value = '';
            await loadRooms();

        } catch (err) {
            console.error('Create room error:', err);
            showToast(err.message || 'Failed to create room', true);
        }
    }

    $('createRoomForm')?.addEventListener('submit', handleCreateRoom);
    $('logoutBtn')?.addEventListener('click', async (e) => {
        e.preventDefault();
        await supabase.auth.signOut();
        window.location.href = '../login.html';
    });

    document.addEventListener('DOMContentLoaded', loadRooms);
})();