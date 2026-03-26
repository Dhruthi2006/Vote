document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector("form")

  form.addEventListener("submit", async (e) => {
    e.preventDefault()

    const fullName = document.querySelector('input[name="fullName"]').value
    const studentId = document.querySelector('input[name="studentId"]').value
    const email = document.querySelector('input[name="email"]').value
    const password = document.querySelector('input[name="password"]').value
    const confirmPassword = document.querySelector('input[name="confirmPassword"]').value

    if (password !== confirmPassword) {
      alert("Passwords do not match")
      return
    }

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          fullName,
          studentId,
          email,
          password
        })
      })

      const data = await response.json()

      if (data.success) {
        alert("Registration successful! Redirecting to login...")

        setTimeout(() => {
          window.location.href = "/login"
        }, 2000)

      } else {
        alert(data.message || "Registration failed")
      }

    } catch (error) {
      console.error(error)
      alert("Server error")
    }
  })
})