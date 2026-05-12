# Edhigo Pani — API Requirement Report

This report outlines all essential API endpoints required for the production-ready Edhigo Pani platform, categorized by functional modules.

## 1. Authentication & User Management (`/auth`)
Essential for securing the app and managing user identities across roles (Farmer, Worker, Leader).

| Endpoint | Method | Purpose |
| :--- | :--- | :--- |
| `/auth/send-otp` | POST | Triggers SMS OTP for login/registration. |
| `/auth/verify-otp` | POST | Validates OTP and returns JWT tokens (Access/Refresh). |
| `/auth/set-role` | POST | Initializes the user role (Farmer/Worker/Leader). |
| `/auth/profile` | PUT/GET | Manages user profile details (Name, Village, Phone, Photo). |
| `/auth/me` | GET | Returns current authenticated user state. |
| `/auth/refresh` | POST | Rotates expired access tokens using a refresh token. |

## 2. Job Lifecycle Management (`/jobs`)
The core engine matching Farmers with Workers/Leaders.

| Endpoint | Method | Purpose |
| :--- | :--- | :--- |
| `/jobs` | POST | (Farmer) Creates a new job request (Work type, Date, Wages). |
| `/jobs` | GET | (Worker) Lists available jobs based on location/filters. |
| `/jobs/my-jobs` | GET | (Farmer) Lists jobs created by the farmer. |
| `/jobs/my-work` | GET | (Worker) Lists jobs the worker is hired for or has applied to. |
| `/jobs/{id}/accept` | POST | (Worker) Accepts a direct job offer. |
| `/jobs/{id}/status` | PUT | Updates job state (Pending -> In Progress -> Completed). |
| `/jobs/nearby-workers`| GET | (Farmer) Identifies available workers within a radius. |
| `/jobs/worker-history`| GET | (Worker) Comprehensive log of past completed works. |

## 3. Attendance System (`/attendance`)
QR-based validation for work commencement and completion.

| Endpoint | Method | Purpose |
| :--- | :--- | :--- |
| `/attendance/check-in` | POST | Validates QR code and logs start time/GPS at farm. |
| `/attendance/check-out`| POST | Logs completion time and validates work duration. |
| `/attendance/{jobId}` | GET | Returns attendance logs for a specific job/group. |

## 4. Group Management (`/groups`)
Module for Group Leaders to organize workers and take bulk jobs.

| Endpoint | Method | Purpose |
| :--- | :--- | :--- |
| `/groups` | POST | (Leader) Creates a new labor group. |
| `/groups/my-groups` | GET | Lists groups where the user is a leader or member. |
| `/groups/{id}/members`| POST | Adds a worker to the group (Invite system). |
| `/groups/{id}/exit` | POST | Allows a worker to leave a group. |
| `/groups/accept-job` | POST | (Leader) Accepts a job on behalf of the entire group. |
| `/groups/pending-invites`| GET | Lists group invites for a worker to join. |

## 5. Payments & Financials (`/payments`)
Financial ledger for wage transfers and commission tracking.

| Endpoint | Method | Purpose |
| :--- | :--- | :--- |
| `/payments` | POST | Initiates wage transfer (Integration with Razorpay/UPI). |
| `/payments/history/{id}`| GET | Returns credit/debit history for the user wallet. |
| `/payments/{id}` | GET | Details of a specific transaction/invoice. |

## 6. Ratings & Reputation (`/ratings`)
Trust-building system for the marketplace.

| Endpoint | Method | Purpose |
| :--- | :--- | :--- |
| `/ratings/worker` | POST | (Farmer) Rates a worker's performance. |
| `/ratings/farmer` | POST | (Worker) Rates a farmer's behavior/payment. |
| `/ratings/user/{id}` | GET | Returns the aggregate rating and reviews for a profile. |

## 7. Communication & Real-time (`/chats` & WebSockets)
Critical for coordination between farmers and workers.

| Endpoint | Method | Purpose |
| :--- | :--- | :--- |
| `/chats/{groupId}/messages` | GET | Fetches group chat history for leaders/members. |
| `Socket: location:update` | WS | Real-time GPS tracking for active work sessions. |
| `Socket: job:offer` | WS | Push notification/alert for new nearby jobs. |

## 8. Media & Documents (`/upload`)
| Endpoint | Method | Purpose |
| :--- | :--- | :--- |
| `/upload/profile` | POST | Uploads user profile photo to S3/Cloudinary. |
| `/upload/qr` | GET | Generates a dynamic QR code for attendance. |

## 9. External Third-Party APIs
Essential integrations for core functionality and localized features.

| Provider | Service | Purpose |
| :--- | :--- | :--- |
| **OpenWeatherMap** | Weather Data | Fetch real-time weather and "Sowing Alerts" for farmers based on GPS. |
| **Google Maps Platform**| Distance Matrix | Calculate precise travel distances for worker matching and payout calculations. |
| **Google Maps Platform**| Places / Geocoding | Convert farm names to lat/lng and vice-versa for address discovery. |
| **Razorpay / UPI** | Payment Gateway | Handle secure fund transfers from Farmer to Worker/Leader wallets. |
| **Twilio / Msg91** | SMS Gateway | Reliable delivery of OTPs and critical job notifications (Arrival/Payment). |
| **Cloudinary / S3** | Image Storage | Store profile photos and work-site verification images. |
| **Firebase Cloud Messaging** | Push Notifications | Send instant "New Job" alerts to workers even when the app is closed. |
