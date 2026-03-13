# DG Event Check-In System

A real-time wristband check-in app for iPad, with an admin panel for managing events and attendees.

---

## What It Does

**Staff (iPad check-in screen)**
- Fuzzy name search across all event attendees
- Tap an attendee → full-screen color flash matching their wristband type
- Auto-resets after 5 seconds, ready for the next person
- Duplicate check-in shows a red warning screen
- Walk-up button for attendees not in the system
- Live count of checked-in vs. total (by badge type)
- Real-time sync across all iPads — check-in on one device, all others update instantly

**Admin (laptop browser)**
- Create and manage events
- Import attendees via CSV upload with smart column mapping
- Add, edit, or delete individual attendees
- Fix names or badge types on the fly
- Live check-in stats dashboard with progress bars
- Export full attendee list with check-in times to CSV
- Role-based access: admin vs. staff

**Default wristband types (auto-created per event):**
- 🟡 VIP Row 1
- 🟢 VIP Rows 2–5  
- ⚫ General Admission

---

## Setup (30–45 minutes)

### Step 1: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) → click **Start your project**
2. Sign up / sign in with GitHub
3. Click **New project**
   - Name it: `dg-events`
   - Set a secure database password (save this somewhere)
   - Choose a region close to your primary location
4. Wait ~2 minutes for the project to spin up

### Step 2: Run the Database Schema

1. In your Supabase project, click **SQL Editor** in the left sidebar
2. Click **New query**
3. Open the file `supabase-schema.sql` from this project
4. Paste the entire contents into the SQL editor
5. Click **Run** (or press Ctrl+Enter)
6. You should see "Success. No rows returned."

### Step 3: Get Your API Keys

1. In Supabase, go to **Settings** (gear icon) → **API**
2. Copy:
   - **Project URL** (looks like `https://abcdefgh.supabase.co`)
   - **anon / public key** (long string starting with `eyJ...`)

### Step 4: Set Up the Code

1. Download this project folder
2. Copy `.env.example` to `.env`
3. Open `.env` and paste your keys:
   ```
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```

### Step 5: Create Your Admin Account

1. In Supabase → **Authentication** → **Users** → click **Invite user**
2. Enter your email address → click **Invite**
3. Check your email and click the invite link to set a password
4. Back in Supabase → **Table Editor** → `profiles` table
5. Find your row → click the **role** cell → change `staff` to `admin` → press Enter
6. Now you're an admin ✓

To add staff accounts: repeat the invite process. They default to `staff` role (check-in only, no admin panel access).

### Step 6: Deploy to Vercel (recommended for multi-iPad use)

1. Push this project to a GitHub repo (or use Vercel CLI)
2. Go to [vercel.com](https://vercel.com) → **New Project** → import your repo
3. Under **Environment Variables**, add:
   - `VITE_SUPABASE_URL` → your Supabase URL
   - `VITE_SUPABASE_ANON_KEY` → your anon key
4. Click **Deploy** — takes ~60 seconds
5. Vercel gives you a URL like `https://dg-events.vercel.app`

**On each iPad:** open Safari → go to your Vercel URL → tap the Share icon → "Add to Home Screen" for a fullscreen app experience.

### Option B: Run Locally (single device or testing)

```bash
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## Day-of Event Workflow

### Before the Event (admin, on laptop)

1. Go to `/admin` → **New Event** → enter name, date, location
2. Click **Import CSV** → upload your attendee export from SamCart/checkout platform
3. Map columns: First Name, Last Name, Email, Badge Type
4. Review preview → Import
5. Check the stats dashboard — all attendees loaded

### At the Event (staff, on iPad)

1. Open the app URL in Safari
2. Log in with your staff credentials
3. Select the event from the dropdown
4. Start checking people in — type their name, tap their card

### Help Desk (admin, on laptop)

- Navigate to `/admin/events/[event]`
- Search for any attendee
- Click the ✏ edit button to fix their name or badge type
- Toggle "checked in" status if needed

---

## CSV Format

Your CSV should have at minimum: First Name, Last Name columns.

Example columns that are auto-detected:
- First Name, First, fname → maps to First Name
- Last Name, Last, lname → maps to Last Name  
- Email, Email Address → maps to Email
- Phone, Mobile, Phone Number → maps to Phone
- Badge Type, Ticket Type, Type → maps to Badge Type

**Badge type matching is fuzzy** — "VIP Row 1", "VIP - Row 1", "vip row 1" all match.  
Unmatched badge types are left blank (you can edit per-attendee in admin).

---

## Troubleshooting

**Attendees not showing on iPad after import**  
→ Pull-to-refresh or switch events and switch back. Real-time sync should catch it automatically.

**"Already checked in" shows but it's a mistake**  
→ Admin opens laptop → finds attendee in admin panel → edit → uncheck "Checked in" → save

**Name not found on iPad**  
→ Use the **+ Walk-Up** button at the bottom right of the check-in screen

**Staff can access admin panel**  
→ Confirm their `role` in the `profiles` table is set to `staff` not `admin`

**Badge color showing wrong on flash screen**  
→ In Supabase → Table Editor → `badge_types` → verify the `color` hex code is correct

---

## Customizing Wristband Colors

In Supabase → Table Editor → `badge_types`:
- Edit the `color` column with any hex code (e.g. `#FFD700` for gold)
- Edit `display_name` to match your wristband labels
- The flash screen text color automatically adjusts for contrast

---

## Tech Stack

- **React + Vite** — runs in any browser, no app store needed
- **Supabase** — real-time Postgres database + auth
- **Fuse.js** — fuzzy name matching (handles typos, partial names)
- **PapaParse** — CSV parsing
- **Tailwind CSS** — styling
- **Vercel** — hosting (free tier)
