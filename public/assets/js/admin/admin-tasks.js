// admin-tasks.js
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

    async function loadUsers() {
        const profile = await getProfile();
        if (!profile || !profile.room_id) {
            $('assignToUser').innerHTML = '<option>Create a room first</option>';
            return;
        }

        const { data: users, error } = await supabase
            .from('users_info')
            .select('id, username, approved')
            .eq('room_id', profile.room_id)
            .eq('approved', true)
            .contains('role_flags', ['user']);

        if (error || !users || users.length === 0) {
            $('assignToUser').innerHTML = '<option>No approved users</option>';
            return;
        }

        $('assignToUser').innerHTML = users.map(u => 
            `<option value="${u.id}">${u.username}</option>`
        ).join('');
    }

    async function loadTasks() {
        const profile = await getProfile();
        if (!profile || !profile.room_id) {
            $('tasksArea').innerHTML = '<p style="color: var(--mut);">Create a room first.</p>';
            return;
        }

        const { data: tasks, error } = await supabase
            .from('tasks')
            .select(`
                *,
                assigned_user:users_info!tasks_assigned_to_fkey(username)
            `)
            .eq('room_id', profile.room_id)
            .order('created_at', { ascending: false });

        const container = $('tasksArea');
        if (error || !tasks || tasks.length === 0) {
            container.innerHTML = '<p style="color: var(--mut);">No tasks created yet.</p>';
            return;
        }

        container.innerHTML = tasks.map(task => {
            const statusMap = {
                'assigned': 'status-assigned',
                'in_progress': 'status-submitted',
                'submitted': 'status-submitted',
                'approved': 'status-approved',
                'rejected': 'status-rejected'
            };
            
            const actions = task.status === 'submitted' 
                ? `
                    <div class="actions">
                        <button onclick="updateTaskStatus('${task.id}', 'approved')" class="btn" style="padding: 6px 12px;">Approve</button>
                        <button onclick="updateTaskStatus('${task.id}', 'rejected')" class="btn danger" style="padding: 6px 12px;">Reject</button>
                    </div>
                `
                : '';

            return `
                <div style="background: var(--elev); padding: 1rem; border-radius: 8px; margin-bottom: 1rem;">
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.5rem;">
                        <h3 style="margin: 0;">${task.title}</h3>
                        <span class="pill ${statusMap[task.status]}">${task.status.replace('_', ' ')}</span>
                    </div>
                    ${task.description ? `<p style="color: var(--mut); margin: 0.5rem 0;">${task.description}</p>` : ''}
                    <div style="display: flex; gap: 1rem; font-size: 0.85rem; color: var(--mut); margin-top: 0.5rem;">
                        <span>👤 ${task.assigned_user?.username || 'Unassigned'}</span>
                        ${task.due_date ? `<span>📅 Due: ${new Date(task.due_date).toLocaleDateString()}</span>` : ''}
                    </div>
                    ${actions}
                </div>
            `;
        }).join('');
    }

    async function handleCreateTask(ev) {
        ev.preventDefault();
        const title = $('taskTitle').value.trim();
        const description = $('taskDescription').value.trim();
        const dueDate = $('taskDue').value;
        const assignedTo = $('assignToUser').value;

        if (!title) return showToast('Task title is required', true);
        if (!assignedTo) return showToast('Please select a user to assign', true);

        const profile = await getProfile();
        if (!profile || !profile.room_id) return;

        try {
            const taskData = {
                room_id: profile.room_id,
                title,
                description: description || null,
                due_date: dueDate || null,
                assigned_to: assignedTo,
                created_by: profile.id,
                status: 'assigned'
            };

            const { error } = await supabase.from('tasks').insert([taskData]);
            if (error) throw error;

            showToast('Task created and assigned!');
            $('taskTitle').value = '';
            $('taskDescription').value = '';
            $('taskDue').value = '';
            await loadTasks();

        } catch (err) {
            console.error('Create task error:', err);
            showToast(err.message || 'Failed to create task', true);
        }
    }

    window.updateTaskStatus = async (taskId, newStatus) => {
        try {
            const { error } = await supabase
                .from('tasks')
                .update({ status: newStatus, updated_at: new Date().toISOString() })
                .eq('id', taskId);

            if (error) throw error;

            showToast(`Task ${newStatus}!`);
            await loadTasks();
        } catch (err) {
            console.error('Update task error:', err);
            showToast(err.message || 'Failed to update task', true);
        }
    };

    $('createTaskForm')?.addEventListener('submit', handleCreateTask);
    $('logoutBtn')?.addEventListener('click', async (e) => {
        e.preventDefault();
        await supabase.auth.signOut();
        window.location.href = '../login.html';
    });

    document.addEventListener('DOMContentLoaded', async () => {
        await loadUsers();
        await loadTasks();
    });
})();