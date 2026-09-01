js_code = """
// Handle inline name editing from modal
document.addEventListener('click', async (e) => {
  if (e.target && e.target.id === 'btn-save-new-name') {
    const newName = document.getElementById('new-display-name').value.trim();
    if (newName.split(' ').filter(w => w.length > 0).length < 3) {
      if (window.showToast) window.showToast('اكتب اسمك الثلاثي على الأقل', 'warn');
      return;
    }
    
    const user = auth.currentUser;
    if (user) {
      try {
        const btn = document.getElementById('btn-save-new-name');
        const originalText = btn.textContent;
        btn.textContent = 'جاري الحفظ...';
        btn.disabled = true;
        
        await update(ref(db, "users/" + user.uid), {
          name: newName
        });
        
        document.getElementById('profile-page-name').textContent = newName;
        const navName = document.getElementById('teacher-name-display');
        if(navName) navName.textContent = newName;
        
        document.getElementById('modal-edit-name').style.display = 'none';
        if (window.showToast) window.showToast('تم تغيير الاسم بنجاح!');
        
        btn.textContent = originalText;
        btn.disabled = false;
      } catch (err) {
        console.error(err);
        if (window.showToast) window.showToast('حصلت مشكلة في حفظ الاسم', 'bad');
      }
    }
  }
});
"""

with open('js/teacher.js', 'a', encoding='utf-8') as f:
    f.write(js_code)
