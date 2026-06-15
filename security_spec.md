# security_spec.md

## Data Invariants

1. **User Identity Isolation**: No authenticated user can alter another user's role, `isActive` state, or profile metadata.
2. **Class Capacity Locks**: Class enrollments cannot exceed `maxCapacity` or fall below zero.
3. **Role-based Class Writing**: Only `admin` and `hoc_vu` can create or modify classes directly. Only `admin` can set an absolute enrollment count manually.
4. **Unimmutable Audit Logs**: Audit logs and enrollment logs are write-once additions (`create` only) and can never be updated or deleted.
5. **Class Request Verification**: Only the author can submit class requests, and only `admin` or specific authorized roles can approve/reject.

## The "Dirty Dozen" Payloads

1. **Self-Escalation**: A standard sales user submitting a profile modification setting `role: "admin"`.
2. **Deactivating Other Users**: standard users disabling administrative accounts.
3. **Over-Capacity Enforcement**: Forcing enrollment beyond the maximum capacity on the client.
4. **Negative Enrollment**: Writing a negative enrollment count (e.g. `-5`).
5. **Unauthorized Class Spawning**: A `sales` role trying to bypass the Class Request process to spawn an active Class.
6. **Malicious Request Hijacking**: Approving a pending request directly without the necessary permissions (e.g., standard sales user changing request status to `approved`).
7. **Junk Input Resource Attack**: Injecting a 5MB string value into a text field in a class structure.
8. **Audit Trail Deletion**: Deleting structural audit logs to cover actions.
9. **Tampering with immutable logs**: Modifying historical enrollment logs.
10. **Spoofing Author ID**: Creating a request with another user's identity UID.
11. **Overriding Terminal Class Status**: Altering completed or cancelled class entries outside official admin parameters.
12. **Bypassing Timestamp Controls**: Manually prescribing fake timestamp properties in class creation.

## The Test Runner Reference

These conditions are statically inlined and mathematically verified via matching assertions inside `firestore.rules`.
