// supabaseClient.js
(function () {
  // IMPORTANT: These are your Supabase Project URL and Anon Key.
  const SUPABASE_URL = "https://adlvxzmtsbarvyqcnlvl.supabase.co";
  const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFkbHZ4em10c2JhcnZ5cWNubHZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEzMTI3MTUsImV4cCI6MjA3Njg4ODcxNX0.RdP9ghEf1gDWj4YFKdwHnWEdsm8TXjb5OD_CpK76a1o";

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || SUPABASE_URL === "YOUR_SUPABASE_URL") {
      console.error("Supabase URL and Anon Key are required. Update supabaseClient.js");
      document.body.innerHTML = `<div style='font-family: sans-serif; padding: 2rem; text-align: center; color: #fecaca; background: #3f1a1a;'><h1>Configuration Error</h1><p>Supabase client is not configured. Please update <code>public/assets/js/lib/supabaseClient.js</code> with your project credentials.</p></div>`;
      return;
  }

  const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  window.SUPABASE = { client: () => supabase };
  console.log("✅ Supabase client initialized.");
})();