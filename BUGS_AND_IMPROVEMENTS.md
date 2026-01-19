# Bugs and Improvements List

## APPLICATIONS

### Search Functionality
- [x] Search Bar should filter while typing (real-time filtering)
- [x] Search Bar doesn't search by name

### UI/UX Improvements
- [x] Edit application - Button to scroll to top of the application
- [ ] Required fields should be marked in red if they don't have data
- [x] Add Staff button should be more visible
- [ ] View LOAN button should be more visible (Note: May need clarification on where this button is)

### Popup/Modal Issues
- [x] Reject button shows browser input prompt, should be a popup modal
- [x] Remove Staff shows browser input prompt, should be a popup modal
- [x] Reject Document button shows browser input prompt, should be a popup modal

### Document Issues
- [x] Download document doesn't work

---

## PROSPECTS

### Search Functionality
- [ ] Search Bar should filter while typing (real-time filtering)
- [ ] Search Bar doesn't search by name

### UI/UX Issues
- [x] In prospects Staff section - Remove Staff shows browser input prompt, should be a popup modal
- [ ] Create New Prospect - Shows "You have unsaved changes" message with current session profile information

---

## MEMBERS

### Search Functionality
- [x] Search Bar should filter while typing (real-time filtering)
- [x] Search Bar doesn't search by name

### UI/UX Improvements
- [ ] Create members button
- [x] Add buttons should be more visible (View button in Applications)

### Popup/Modal Issues
- [x] Remove Staff shows browser input prompt, should be a popup modal

---

## USERS

### Search Functionality
- [x] Search Bar doesn't search by name

### Functionality Issues
- [x] Delete button doesn't delete

### UI/UX Improvements
- [x] Edit User button to scroll to top of page

---

## STAFF

### Search Functionality
- [x] Search Bar doesn't search by name

### Functionality Issues
- [ ] Delete button doesn't delete (Note: StaffList doesn't have delete button, may need to add)

---

## DEPARTMENTS

### Permissions Issues
- [ ] When selecting permissions for admin View Edit or Delete

---

## PLANS

### UI/UX Improvements
- [x] Create Plan button to scroll to top of page

### Validation Issues
- [x] When creating a plan, it doesn't show where the error is (no validation error display)

---

## LOANS

### Search Functionality
- [x] Error when searching by code
- [x] Error when searching by name

### Document Issues
- [x] Upload document requires page refresh to show the document
- [x] Cannot download the document

### Popup/Modal Issues
- [x] Reject Document button shows browser input prompt, should be a popup modal

---

## Summary by Category

### High Priority (Functionality Breaking)
- [x] Download document doesn't work (Applications)
- [x] Delete button doesn't delete (Users) - Fixed
- [ ] Delete button doesn't delete (Staff) - StaffList doesn't have delete button
- [x] Error when searching by code/name (Loans)
- [x] Cannot download document (Loans)
- [ ] Upload document requires refresh (Loans)

### Medium Priority (UX Issues)
- [x] Search bars don't filter in real-time (multiple sections) - Fixed
- [x] Search bars don't search by name (multiple sections) - Fixed
- [x] Popups using browser prompts instead of modals (Reject buttons) - Fixed
- [x] Popups using browser prompts instead of modals (Remove Staff) - Fixed
- [x] Required field validation not visible (Plans) - Fixed
- [ ] Required field validation not visible (Applications) - Still needs fixing

### Low Priority (UI Polish)
- [x] Buttons should be more visible (multiple sections) - View and Add Staff buttons improved
- [x] Buttons to scroll to top of page (Applications, Plans, Users) - Fixed
- [ ] Incorrect "unsaved changes" message (Prospects)
