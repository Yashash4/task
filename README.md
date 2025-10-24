# Task Manager - Supabase Edition

A complete task manager application built with vanilla HTML, CSS, JavaScript and powered by Supabase.

## Features

- **User & Admin Roles**: Separate interfaces and permissions for regular users and administrators.
- **Room-based Multi-tenancy**: Admins create rooms and invite users with a unique code.
- **Task Lifecycle**: Admins create and assign tasks. Users submit tasks for approval. Admins can approve or reject submissions.
- **Secure Auth**: Built on top of Supabase Auth.
- **Dynamic UI**: No page reloads for most actions.

## Setup Instructions

1.  **Create a Supabase project.**
2.  Navigate to the **SQL Editor** in your Supabase dashboard.
3.  Copy the entire content of /sql/schema.sql and run it to set up your database tables and functions.
4.  Go to the **API** settings in your Supabase dashboard to find your Project URL and non public key.
5.  Open public/assets/js/lib/supabaseClient.js and replace the placeholder values with your actual Supabase URL and Anon Key.
6.  Deploy the /public directory to a static web host like Netlify, Vercel, or GitHub Pages.

## How It Works

1.  An **Admin** signs up without a room code.
2.  The Admin goes to the **Rooms** page in their dashboard and creates a new room. A unique code is generated.
3.  The Admin shares this code with their users.
4.  A **User** signs up using the room code. Their account is created but marked as pproved: false.
5.  The Admin sees the new user on the **Users** page and clicks "Approve".
6.  The User can now log in and see their assigned tasks.
