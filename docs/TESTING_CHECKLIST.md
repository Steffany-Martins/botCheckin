# Bot Check-In Testing Checklist

## Recent Changes to Test

### ✅ Fixed Issues:
1. **Number navigation (10+)**: Manager menu now supports option 10 (Editar Horários)
2. **Command "0" in conversations**: Pressing 0 now exits conversations and shows menu
3. **Session management**: Sessions are created on login, deleted on logout, using PostgreSQL Pool
4. **GPS data saving**: GPS coordinates (latitude, longitude, distance_meters) saved to database
5. **Navigation footer**: Removed repetitive full menus, added simple "0️⃣ Menu | 9️⃣ Menu Principal" footer

---

## Test Flows

### 1. Registration & Login

#### New User Registration (Staff)
- [ ] Send any message from unregistered number
- [ ] Should receive: "Bem-vindo! Vamos criar seu cadastro..."
- [ ] Enter name (min 2 chars)
- [ ] Select role: 1-Staff, 2-Supervisor, 3-Manager
- [ ] Select categories: 1-Bar, 2-Restaurante, 3-Padaria, 4-Outro
- [ ] Should auto-login and show menu
- [ ] Verify: Session created in database (`SELECT * FROM sessions WHERE phone = 'whatsapp:+XXXX'`)

#### New User Registration (Manager/Supervisor)
- [ ] Follow staff registration steps
- [ ] After categories, should ask for password
- [ ] Enter correct admin password
- [ ] Should create user and show menu
- [ ] Verify: User created with correct role

#### Existing User Auto-Login
- [ ] Staff user sends "1" (CHECKIN)
- [ ] Should auto-login and perform check-in
- [ ] Verify: Session created in database

#### Manual Login (Manager/Supervisor)
- [ ] Send "LOGIN <password>"
- [ ] Should login and show menu
- [ ] Verify: Session created in database

---

### 2. Staff Role - Basic Check-in Flow

#### Check-in without GPS
- [ ] Send "1" (CHECKIN)
- [ ] Should receive confirmation: "🟢 Check-in registrado"
- [ ] Should show footer: "0️⃣ Menu | 9️⃣ Menu Principal"
- [ ] Should NOT show full menu
- [ ] Verify: Checkin created in database with type='checkin'

#### Check-in with GPS (location verified)
- [ ] Send "1" with GPS location within 200m
- [ ] Should show: "✅ Local verificado (XXm do restaurante)"
- [ ] Verify in database:
  - `latitude` saved
  - `longitude` saved
  - `location_verified = 1`
  - `distance_meters` saved

#### Check-in with GPS (location NOT verified)
- [ ] Send "1" with GPS location beyond 200m
- [ ] Should show: "⚠️ Atenção: Você está XXXm do restaurante (máx: 200m)"
- [ ] Verify in database:
  - GPS data saved
  - `location_verified = 0`
  - `distance_meters` saved

#### Break
- [ ] Send "2" (BREAK)
- [ ] Should receive confirmation: "🟡 Pausa registrada"
- [ ] Verify: Checkin created with type='break'

#### Return from Break
- [ ] Send "3" (RETURN)
- [ ] Should receive confirmation: "🔵 Retorno registrado"
- [ ] Verify: Checkin created with type='return'

#### Check-out
- [ ] Send "4" (CHECKOUT)
- [ ] Should receive confirmation: "🔴 Check-out registrado"
- [ ] Verify: Checkin created with type='checkout'

#### View Statistics
- [ ] Send "5" (STAT)
- [ ] Should show user history with check-ins/outs
- [ ] Should show footer: "0️⃣ Menu | 9️⃣ Menu Principal"
- [ ] Should NOT show full menu

---

### 3. Manager Role - All 10 Options

#### Option 1-5: Same as Staff
- [ ] Test CHECKIN, BREAK, RETURN, CHECKOUT, STAT

#### Option 6: All Schedules
- [ ] Send "6"
- [ ] Should show all users grouped by category
- [ ] Should show footer only (no full menu)

#### Option 7: Search User (Conversation)
- [ ] Send "7"
- [ ] Should ask: "Digite o nome da pessoa"
- [ ] Should show: "0️⃣ Voltar | 9️⃣ Menu Principal"
- [ ] Enter search term (min 2 chars)
- [ ] Should show numbered list of results
- [ ] Should show: "💡 Digite o número (1-N)"
- [ ] Should show: "0️⃣ Voltar | 9️⃣ Menu Principal"

##### Test "0" to cancel
- [ ] Press "0" at search results
- [ ] Should cancel conversation
- [ ] Should show: "❌ Operação cancelada."
- [ ] Should show menu

##### Test selecting user
- [ ] Enter number to select user
- [ ] Should show user details
- [ ] Should show footer only

#### Option 8: Set Hours (Conversation)
- [ ] Send "8"
- [ ] Should start search conversation
- [ ] Enter name to search
- [ ] Select user number
- [ ] Should ask: "Quantas horas por semana são esperadas?"
- [ ] Enter hours (e.g., "40")
- [ ] Should confirm: "✅ Horas Definidas com Sucesso!"
- [ ] Should show footer only (no full menu)
- [ ] Verify: `expected_weekly_hours` updated in database

##### Test "0" to cancel at any step
- [ ] Start flow, press "0" at search step
- [ ] Should cancel and show menu
- [ ] Start flow again, press "0" at hours input step
- [ ] Should cancel and show menu

#### Option 9: Edit Category (Conversation)
- [ ] Send "9"
- [ ] Follow search flow
- [ ] Should ask for categories
- [ ] Enter category numbers (e.g., "1 2")
- [ ] Should confirm: "✅ Categorias Atualizadas!"
- [ ] Should show footer only
- [ ] Verify: `categories` updated in database

#### Option 10: Edit Hours (Conversation) ⭐ NEW FIX
- [ ] Send "10" (was broken before with 'A')
- [ ] Should start conversation: "Digite o nome da pessoa"
- [ ] Enter name to search
- [ ] Should show numbered list of users
- [ ] Select user number
- [ ] Should show list of recent check-ins (max 10)
- [ ] Should show: "💡 Selecione o número (1-N) para editar"
- [ ] Select check-in number
- [ ] Should ask: "Envie o novo horário no formato HH:MM"
- [ ] Enter time (e.g., "14:30")
- [ ] Should confirm: "✅ Horário atualizado!"
- [ ] Should show old and new times
- [ ] Should show footer only
- [ ] Verify in database:
  - `timestamp` updated
  - `edited_by` set to manager's user_id

##### Test "0" to cancel at each step ⭐ NEW FIX
- [ ] Press "0" at user search → should cancel
- [ ] Press "0" at user selection → should cancel
- [ ] Press "0" at checkin selection → should cancel
- [ ] Press "0" at time input → should cancel
- [ ] All should show: "❌ Operação cancelada." and menu

#### Option 0: Logout
- [ ] Send "0"
- [ ] Should logout and show goodbye message
- [ ] Verify: Session deleted from database

---

### 4. Supervisor Role

#### Option 5: Team Active
- [ ] Send "5"
- [ ] Should show team members' status
- [ ] Should show footer only

#### Option 6: Team History
- [ ] Send "6"
- [ ] Should show team check-in history
- [ ] Should show footer only

#### Option 7: Edit Hours (same as manager option 10)
- [ ] Send "7"
- [ ] Test full edit hours conversation flow
- [ ] Test "0" to cancel at each step

---

### 5. Global Navigation Commands

#### Command 9: Menu Principal (from anywhere)
- [ ] Start any conversation (search user, edit hours, etc.)
- [ ] Press "9"
- [ ] Should cancel conversation
- [ ] Should show: "📋 Menu Principal"
- [ ] Should show full menu

#### Command 0: Context-Dependent Back/Cancel ⭐ NEW FIX
- [ ] When NOT in conversation:
  - [ ] Press "0" → should LOGOUT
  - [ ] Should show goodbye message

- [ ] When IN conversation:
  - [ ] Start conversation (option 7, 8, 9, or 10)
  - [ ] Press "0" → should CANCEL conversation
  - [ ] Should show: "❌ Operação cancelada."
  - [ ] Should show menu
  - [ ] Should NOT logout

---

### 6. Session Management ⭐ NEW FIX

#### Login Creates Session
- [ ] Login as manager: "LOGIN <password>"
- [ ] Query database: `SELECT * FROM sessions WHERE phone = 'whatsapp:+XXXX'`
- [ ] Should have one active session
- [ ] `expires_at` should be ~24 hours in future

#### Logout Deletes Session
- [ ] While logged in, send "0" (LOGOUT)
- [ ] Query database again
- [ ] Session should be deleted

#### Auto-login Creates Session
- [ ] Staff user sends "1" (CHECKIN) without being logged in
- [ ] Should auto-login and perform action
- [ ] Query database
- [ ] Session should be created

#### Session Cleanup (Expired Sessions)
- [ ] Wait for cleanup interval (2 minutes)
- [ ] Or manually set `expires_at` to past time
- [ ] Should auto-delete expired sessions

---

### 7. GPS Location Verification ⭐ NEW FIX

#### Verify GPS Data Saved in Database
- [ ] Perform check-in with GPS location
- [ ] Query: `SELECT latitude, longitude, location_verified, distance_meters FROM checkins WHERE id = LAST_INSERT_ID()`
- [ ] All fields should have values (not NULL)
- [ ] `latitude` should be decimal number
- [ ] `longitude` should be decimal number
- [ ] `location_verified` should be 1 (within 200m) or 0 (beyond 200m)
- [ ] `distance_meters` should be calculated distance

#### Verify Location Calculation
- [ ] Check logs for: "📍 Creating checkin with GPS:"
- [ ] Check logs for: "✅ Checkin with GPS created, ID: X"
- [ ] Verify distance calculation matches message shown to user

---

### 8. UI/UX - No Repetitive Menus ⭐ NEW FIX

#### Footer Shows Instead of Full Menu
For each action below, verify response ends with ONLY:
```
0️⃣ Menu | 9️⃣ Menu Principal
```
NOT the full menu (1️⃣ Check-in, 2️⃣ Pausa, etc.)

- [ ] After CHECKIN
- [ ] After BREAK
- [ ] After RETURN
- [ ] After CHECKOUT
- [ ] After STAT
- [ ] After ALL_SCHEDULES
- [ ] After SEARCH_USER (completed)
- [ ] After SET_HOURS (completed)
- [ ] After EDIT_CATEGORY (completed)
- [ ] After EDIT_HOURS (completed)
- [ ] After TEAM_ACTIVE
- [ ] After TEAM_HISTORY

#### Full Menu Shows Only When Appropriate
- [ ] After LOGIN (shows full menu)
- [ ] After REGISTRATION (shows full menu)
- [ ] After pressing "9" (Menu Principal)
- [ ] After "0" when in conversation (cancels, shows menu)

---

### 9. Error Handling

#### Invalid Commands
- [ ] Send "INVALID"
- [ ] Should show error or ignore
- [ ] Should not crash

#### Invalid Number Selections
- [ ] In conversation, send "99" (out of range)
- [ ] Should show: "Digite um número de 1 a X"
- [ ] Should NOT show "enviar numero de 1 a 1" ⭐ OLD BUG

#### Search No Results
- [ ] Search for non-existent name
- [ ] Should show: "🔍 Nenhum resultado"
- [ ] Should show footer with options to retry

#### Invalid Time Format (Edit Hours)
- [ ] Enter "25:99" (invalid time)
- [ ] Should show: "Horário inválido. Horas devem ser 0-23 e minutos 0-59."

---

## Database Verification Queries

### Check Sessions
```sql
SELECT * FROM sessions WHERE phone = 'whatsapp:+XXXXXXXXXX';
SELECT * FROM sessions WHERE expires_at < NOW(); -- Should be 0 after cleanup
```

### Check GPS Data in Check-ins
```sql
SELECT id, user_id, type, timestamp, latitude, longitude, location_verified, distance_meters
FROM checkins
WHERE latitude IS NOT NULL
ORDER BY timestamp DESC
LIMIT 10;
```

### Check Edited Hours
```sql
SELECT id, user_id, type, timestamp, edited_by, edited_at
FROM checkins
WHERE edited_by IS NOT NULL
ORDER BY edited_at DESC
LIMIT 10;
```

### Check User Data
```sql
SELECT id, name, phone, role, categories, expected_weekly_hours, active
FROM users
WHERE phone = 'whatsapp:+XXXXXXXXXX';
```

---

## Success Criteria

✅ All 10 manager menu options work (especially option 10)
✅ Command "0" exits conversations without error
✅ Sessions are created on login and deleted on logout
✅ GPS data (lat, lon, distance) is saved to database
✅ No repetitive full menus after actions
✅ Simple footer appears instead
✅ Full menu only on login, registration, and explicit menu command
✅ All conversation flows can be cancelled with "0"
✅ All conversation flows can return to menu with "9"
