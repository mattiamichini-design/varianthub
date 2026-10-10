document.querySelector('form').addEventListener('submit', event => {
  event.preventDefault();
  const email = new FormData(event.currentTarget).get('email');
  document.querySelector('[role="status"]').textContent = `You're on the list, ${email}. This demo keeps your address in this page only.`;
});
