# 🗺️ FarmConnect — App Flow & Mock File Mapping

## 1. High-Level App Flow

```mermaid
flowchart TD
    A["Splash Screen"] --> B["Language Selection"]
    B --> C["Login (Phone)"]
    C --> D["OTP Verification"]
    D --> E["Role Selection"]
    E --> F["Farmer Home"]
    E --> G["Worker Home"]
    E --> H["Leader Home"]

    F --> F1["Select Work Type"]
    F1 --> F2["Select Workers (Individual/Group)"]
    F2 --> F3["Request Sent (Radar)"]
    F3 --> F4["Request Accepted (Live Map)"]
    F4 --> F5["Arrival Alert"]
    F5 --> F6["QR Attendance IN"]
    F6 --> F7["Work In Progress"]
    F7 --> F8["QR Attendance OUT"]
    F8 --> F9["Payment (Cash/UPI)"]
    F9 --> F10["Rate Worker"]
    F10 --> F

    G --> G1["Receive Job Offer"]
    G1 -->|Accept| G2["GPS Navigation"]
    G1 -->|Decline| G
    G2 --> G3["Scan QR Attendance IN"]
    G3 --> G4["Worker Status (Working)"]
    G4 --> G5["Scan QR Attendance OUT"]
    G5 --> G6["Rate Farmer"]
    G6 --> G

    H --> H1["Start Group"]
    H1 --> H2["Group Setup (QR Join)"]
    H2 --> H3["Group QR Attendance IN"]
    H3 --> H4["Live Map & Call"]
    H4 --> H5["Group Attendance Confirmed"]
    H5 --> H6["Rate Farmer"]
    H6 --> H
```

---

## 2. Onboarding Flow

```mermaid
flowchart LR
    S["Splash\n(code26)"] --> L["Language\n(code6)"]
    L --> P["Phone Login\n(code13)"]
    P --> O["OTP\n(code15)"]
    O --> R["Role Select\n(code25)"]
    R -->|Farmer| FH["Farmer Home\n(code3)"]
    R -->|Worker| WH["Worker Home\n(code30)"]
    R -->|Leader| LH["Leader Home\n(code27)"]
```

---

## 3. Farmer Job Lifecycle

```mermaid
flowchart TD
    FH["Farmer Home\n(code3)"] --> WT["Work Type\n(code3)"]
    WT --> SW["Select Workers\n(code32)"]
    SW --> RS["Request Sent\n(code24)"]
    RS --> RA["Request Accepted\n(code23)"]
    RA --> AA["Arrival Alert\n(code.html)"]
    AA --> QI["QR Attendance IN\n(code18)"]
    QI --> WIP["Work In Progress\n(code29)"]
    WIP --> QO["QR Attendance OUT\n(code19)"]
    QO --> PAY["Payment\n(code16)"]
    PAY --> RW["Rate Worker\n(code22)"]
    RW --> FH
```

---

## 4. Worker Job Lifecycle

```mermaid
flowchart TD
    WH["Worker Home\n(code30)"] --> JO["Job Offer\n(code10)"]
    JO -->|Accept| NAV["GPS Navigation\n(code14)"]
    JO -->|Decline| WH
    NAV --> QR["Scan QR IN\n(code17)"]
    QR --> AC["Attendance Confirmed\n(code2)"]
    AC --> ST["Status: Working\n(code28)"]
    ST --> QRO["Scan QR OUT\n(code17)"]
    QRO --> RF["Rate Farmer\n(code21)"]
    RF --> WH
```

---

## 5. Group Leader Workflow

```mermaid
flowchart TD
    LH["Leader Home\n(code27)"] --> SG["Start Group"]
    SG --> GS["Group Setup\n(code8)"]
    GS --> GQR["Group QR IN\n(code7)"]
    GQR --> GAC["Group Confirmed\n(code5)"]
    GAC --> LM["Live Map & Call\n(code11)"]
    LM --> RFG["Rate Farmer\n(code20)"]
    RFG --> LH
```

---

## 6. Mock File → Screen Mapping

| File | Screen Title | Role | Category |
|------|-------------|------|----------|
| `code26.html` | Splash / Loading | All | Onboarding |
| `code6.html` | Language Selection | All | Onboarding |
| `code13.html` | Login (Phone + Custom Keypad) | All | Auth |
| `code15.html` | OTP Verification | All | Auth |
| `code25.html` | Role Selection | All | Onboarding |
| `code3.html` | Farmer Home (Work Type Grid) | Farmer | Home |
| `code4.html` | Farmer Profile Details | Farmer | Profile |
| `code32.html` | Worker Type & Count Selection | Farmer | Job Posting |
| `code24.html` | Request Sent (Radar Animation) | Farmer | Job Posting |
| `code23.html` | Request Accepted (Live Map) | Farmer | Job Status |
| `code.html` / `code1.html` | Arrival Alert (Worker Arrived) | Farmer | Job Status |
| `code18.html` | QR Display — Attendance IN | Farmer | Attendance |
| `code29.html` | Work In Progress (Timer + Map) | Farmer | Active Work |
| `code19.html` | QR Display — Attendance OUT | Farmer | Attendance |
| `code16.html` | Payment (Cash / UPI + QR) | Farmer | Payment |
| `code22.html` | Rate Worker (Emoji + Stars) | Farmer | Rating |
| `code30.html` | Worker Home (Start Work) | Worker | Home |
| `code31.html` | Worker Profile (Skills + Animals) | Worker | Profile |
| `code28.html` | Worker Status (Available/Working/Break) | Worker | Status |
| `code10.html` | Job Offer (Accept / Decline) | Worker | Job Offer |
| `code14.html` | GPS Navigation to Farmer | Worker | Navigation |
| `code17.html` | QR Camera Scanner | Worker | Attendance |
| `code2.html` | Attendance Confirmed | Worker | Attendance |
| `code21.html` | Rate Farmer (Telugu Emoji) | Worker | Rating |
| `code27.html` | Leader Home (Start Group) | Leader | Home |
| `code8.html` | Group Setup (QR Join + Members) | Leader | Group Mgmt |
| `code7.html` | Group QR Attendance IN | Leader | Attendance |
| `code5.html` | Group Attendance Confirmed | Leader | Attendance |
| `code9.html` | Group QR Attendance IN (alt) | Leader | Attendance |
| `code11.html` | Live Map & Call (Group Tracking) | Leader | Tracking |
| `code12.html` | Live Map Discovery (Find Workers) | All | Discovery |
| `code20.html` | Rate Farmer (Group Leader View) | Leader | Rating |
| `login-demo.html` | Demo Login Page (Dev Testing) | Dev | Testing |

---

## 7. Bottom Navigation Tabs by Role

| Role | Tab 1 | Tab 2 | Tab 3 | Tab 4 |
|------|-------|-------|-------|-------|
| **Farmer** | Home | Jobs | Group | Profile |
| **Worker** | Home | Tasks/History | Alerts | Profile |
| **Leader** | Home | History | — | Profile |
