import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// Controleer of Supabase al bestaat in de globale browsercontext
if (!window.supabase) {
    const SUPABASE_URL = 'https://drpbsfbqtxiprmubawkb.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRycGJzZmJxdHhpcHJtdWJhd2tiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzg2NjQ1MjAsImV4cCI6MjA1NDI0MDUyMH0.9ithiLp4hnRDxpmU8Bm2TgB8zZtTrBMIVWL1vWfICVQ';

    window.supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: { persistSession: true }, // Zorg ervoor dat sessies bewaard blijven
    });

    console.log('✅ Supabase-instantie gecreëerd en opgeslagen in window.');
} else {
    console.log('⚠️ Supabase-instantie hergebruikt uit window.');
}

// Exporteer de globale instantie
export const supabase = window.supabase;
