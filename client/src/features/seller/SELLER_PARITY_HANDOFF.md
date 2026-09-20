# Seller taxonomy dialog handoff

The seller taxonomy proposal-withdrawal confirmation now follows the workspace keyboard contract: Escape cancels only while idle, cancellation restores focus to the initiating control, and an in-flight withdrawal cannot be dismissed. API contracts, session state, loaded seller data, and global/shared code are unchanged.

The normal focused suite passed 7/7 on integration. Authenticated rendered acceptance remains blocked on a legitimate seller session.
