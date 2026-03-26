// Authentication helper functions

function requireAuth(requiredRole = null) {
  const token = localStorage.getItem("token")
  const user = JSON.parse(localStorage.getItem("user") || "{}")

  if (!token) {
    window.location.href = "/login"
    return
  }

  if (requiredRole && user.role !== requiredRole) {
    alert("Access denied. Insufficient permissions.")
    window.location.href = "/"
    return
  }
}

function logout() {
  localStorage.removeItem("token")
  localStorage.removeItem("user")
  window.location.href = "/login"
}

// Check if user is already logged in on auth pages
function redirectIfAuthenticated() {
  const token = localStorage.getItem("token")
  const user = JSON.parse(localStorage.getItem("user") || "{}")

  if (token) {
    if (user.role === "admin") {
      window.location.href = "/admin"
    } else {
      window.location.href = "/vote"
    }
  }
}
