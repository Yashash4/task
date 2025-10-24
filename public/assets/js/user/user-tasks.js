// user-tasks.js
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
        if (error || !profile) { 
            await supabase.auth.signOut();
            window.location.href = '../login.html'; 
            return null; 
        }

        if (!profile.approved) {
            await supabase.auth.signOut();
            window.location.href = '../login.html';
            return null;
        }

        return profile;
    }

    async function loadTasks() {
        const profile = await getProfile();
        if (!profile) return;

        const { data: tasks, error } = await supabase
            .from('tasks')
            .select('*')
            .eq('assigned_to', profile.id)
            .order('created_at', { ascending: false });

        const container = $('myTasks');
        if (error || !tasks || tasks.length === 0) {
            container.innerHTML = '<p style="color: var(--mut);">No tasks assigned to you yet.</p>';
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

            let actions = '';
            if (task.status === 'assigned') {
                actions = `
                    <div class="actions">
                        <button onclick="updateTaskStatus('${task.id}', 'in_progress')" class="btn" style="padding: 8px 14px;">Start Working</button>
                    </div>
                `;
            } else if (task.status === 'in_progress') {
                actions = `
                    <div class="actions">
                        <button onclick="updateTaskStatus('${task.id}', 'submitted')" class="btn" style="padding: 8px 14px;">Submit for Review</button>
                    </div>
                `;
            } else if (task.status === 'rejected') {
                actions = `
                    <div class="actions">
                        <button onclick="updateTaskStatus('${task.id}', 'in_progress')" class="btn secondary" style="padding: 8px 14px;">Rework Task</button>
                    </div>
                `;
            }

            return `
                <div style="background: var(--elev); padding: 1.25rem; border-radius: 8px; margin-bottom: 1rem; border-left: 3px solid ${task.status === 'approved' ? 'var(--ok)' : task.status === 'rejected' ? 'var(--bad)' : 'var(--brand)'};">
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.75rem;">
                        <h3 style="margin: 0; font-size: 1.15rem;">${task.title}</h3>
                        <span class="pill ${statusMap[task.status]}">${task.status.replace('_', ' ')}</span>
                    </div>
                    ${task.description ? `<p style="color: var(--mut); margin: 0.5rem 0; line-height: 1.5;">${task.description}</p>` : ''}
                    <div style="display: flex; gap: 1.5rem; font-size: 0.85rem; color: var(--mut); margin-top: 0.75rem;">
                        ${task.due_date ? `<span>📅 Due: ${new Date(task.due_date).toLocaleDateString()}</span>` : ''}
                        <span>Created: ${new Date(task.created_at).toLocaleDateString()}</span>
                    </div>
                    ${actions ? `<div style="margin-top: 1rem;">${actions}</div>` : ''}
                </div>
            `;
        }).join('');
    }

    window.updateTaskStatus = async (taskId, newStatus) => {
        try {
            const { error } = await supabase
                .from('tasks')
                .update({ 
                    status: newStatus, 
                    updated_at: new Date().toISOString() 
                })
                .eq('id', taskId);

            if (error) throw error;

            const statusMessages = {
                'in_progress': 'Task marked as in progress!',
                'submitted': 'Task submitted for review!',
            };

            showToast(statusMessages[newStatus] || 'Task updated!');
            await loadTasks();
        } catch (err) {
            console.error('Update task error:', err);
            showToast(err.message || 'Failed to update task', true);
        }
    };

    $('logoutBtn')?.addEventListener('click', async (e) => {
        e.preventDefault();
        await supabase.auth.signOut();
        window.location.href = '../login.html';
    });

    document.addEventListener('DOMContentLoaded', loadTasks);
})();