# Security Specification & Threat Model

## 1. Data Invariants
1. **Verified Identity Ownership**: Every user profile (`/users/{userId}`), calendar event (`/users/{userId}/events/{eventId}`), and backlog task (`/users/{userId}/tasks/{taskId}`) belongs strictly to the authenticated, email-verified user whose `uid` equals `userId`.
2. **Explicit Teacher Authorization**: A teacher can read a student's profile, events, and tasks **only** if their verified Gmail (`request.auth.token.email`) matches the `teacherEmail` explicitly configured on that student's records, or if the user is the bootstrapped app creator (`nicolecarillo957@gmail.com`).
3. **Zero Privilege Escalation / Tiered Updates**: Teachers can only verify student evidence (`evidence`, `updatedAt`) and cannot rewrite student event titles, schedules, or profile fields. Students cannot spoof another user's `uid` or `email`.
4. **Feedback Chat Privacy & Creator Routing**: All feedback messages in `/feedback_messages/{messageId}` must target `recipientEmail == 'nicolecarillo957@gmail.com'`, must bear the sender's verified `senderUid` and `senderEmail`, and can only be read by the sender or the creator (`nicolecarillo957@gmail.com`). Only the creator can write `replyText` and `replyByEmail`.
5. **Temporal Integrity & Bounded Payloads**: All `createdAt` and `updatedAt` fields must equal `request.time`; `createdAt` and owner IDs are immutable after creation; all strings and arrays enforce strict size bounds.

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Unauthenticated Profile Read**: Anonymous client attempts `GET /users/uid_student_1` -> `PERMISSION_DENIED`.
2. **Unverified Email Spoofing**: Attacker with `email: "nicolecarillo957@gmail.com"` and `email_verified: false` attempts `LIST /feedback_messages` -> `PERMISSION_DENIED`.
3. **Cross-Student Snooping**: Signed-in `studentB@gmail.com` (not listed as `teacherEmail`) attempts `LIST /users/uid_student_A/events` -> `PERMISSION_DENIED`.
4. **Profile Identity Spoofing**: `studentA` attempts `CREATE /users/uid_student_B` with `uid: "uid_student_B"` -> `PERMISSION_DENIED`.
5. **Shadow Field Injection on Profile**: `studentA` attempts `CREATE /users/uid_student_A` including `"isAdmin": true` -> `PERMISSION_DENIED` (blocked by `keys().hasOnly`).
6. **Immutability Bypass on Update**: `studentA` attempts `UPDATE /users/uid_student_A` modifying `email` or `createdAt` -> `PERMISSION_DENIED`.
7. **Teacher Overreach Update**: Assigned teacher attempts `UPDATE /users/uid_student_A/events/evt1` changing `title` or `isCompleted` -> `PERMISSION_DENIED` (`affectedKeys().hasOnly(['evidence', 'updatedAt'])`).
8. **Client-Forged Timestamp**: Client attempts `CREATE /feedback_messages/msg1` with `createdAt` set to a past ISO string or client Date instead of `request.time` -> `PERMISSION_DENIED`.
9. **Feedback Spoofing (Forged Reply on Create)**: Student attempts `CREATE /feedback_messages/msg1` with `replyText: "Approved!"` -> `PERMISSION_DENIED`.
10. **Cross-User Feedback Scraping**: `studentB` attempts `GET /feedback_messages/msg_from_studentA` -> `PERMISSION_DENIED`.
11. **Path Variable / ID Poisoning**: Attacker attempts `CREATE /users/uid_student_A/events/bad$$id!!` -> `PERMISSION_DENIED` (`isValidId`).
12. **Resource Exhaustion (Oversized String)**: Client attempts `CREATE /feedback_messages/msg2` with a 50,000-character `text` field -> `PERMISSION_DENIED` (`text.size() <= 1000`).
