# Modal Troubleshooting Guide

The feedback and new features modals exist but don't appear. Here's how to debug:

## Step 1: Open Browser Console

Press F12 or Cmd+Option+I to open developer tools

## Step 2: Test Modal Existence

Paste this in console:
```javascript
console.log('Feedback modal:', document.getElementById('feedback-modal'));
console.log('New features modal:', document.getElementById('new-features-modal'));
```

**Expected:** Both should show `<div id="...">` elements, not `null`

## Step 3: Test showModal Function

Paste this in console:
```javascript
app.showModal('feedback-modal');
```

**Check the console for these messages:**
- "showModal called with ID: feedback-modal"
- "Modal 'feedback-modal' found, showing..."

## Step 4: Check if Hidden Class is Removed

After clicking the feedback widget, paste this:
```javascript
const modal = document.getElementById('feedback-modal');
console.log('Classes:', modal.className);
console.log('Has hidden class:', modal.classList.contains('hidden'));
```

**Expected:** `hidden` should be false/not in the list

## Step 5: Check Computed Styles

After clicking the feedback widget:
```javascript
const modal = document.getElementById('feedback-modal');
const styles = window.getComputedStyle(modal);
console.log('Display:', styles.display);
console.log('Visibility:', styles.visibility);
console.log('Opacity:', styles.opacity);
console.log('Z-index:', styles.zIndex);
console.log('Position:', styles.position);
```

**Expected:**
- Display: flex
- Visibility: visible
- Opacity: 1
- Z-index: 10001
- Position: fixed

## Step 6: Force Show Modal

Try manually removing hidden class:
```javascript
const modal = document.getElementById('feedback-modal');
modal.classList.remove('hidden');
modal.style.display = 'flex';
modal.style.visibility = 'visible';
modal.style.opacity = '1';
modal.style.zIndex = '99999';
```

**If the modal appears:** There's a CSS conflict
**If it still doesn't appear:** There's a positioning or DOM issue

## Step 7: Check Event Listeners

```javascript
const widget = document.getElementById('feedback-widget');
console.log('Widget exists:', !!widget);
console.log('Has listener flag:', widget?.hasListener);
```

## What to Report

Share what you see for each step, especially:
- Does console show "showModal called"?
- Is hidden class removed?
- What are the computed styles?
- Does Step 6 (force show) work?
