import { useEffect, useState } from "react";
import Login from "./Login.jsx";

const API_URL = "http://localhost:5000/api";

const initialDepartments = [
  { name: "Engineering", head: "Rahul Reddy", employees: 18, color: "#6366f1" },
  {
    name: "Human Resources",
    head: "Priya Sharma",
    employees: 6,
    color: "#ec4899",
  },
  { name: "Finance", head: "Sneha Rao", employees: 8, color: "#14b8a6" },
  { name: "Marketing", head: "Vikram Singh", employees: 12, color: "#f59e0b" },
];

const navigation = [
  { label: "Dashboard", icon: "▦" },
  { label: "Employees", icon: "♙" },
  { label: "Departments", icon: "▤" },
  { label: "My Profile", icon: "◎" },
];

async function apiRequest(endpoint, token, options = {}) {
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Something went wrong.");
  }

  return data;
}

function normalizeEmployee(employee) {
  return {
    ...employee,
    department: employee.department || "Unassigned",
    role: employee.designation || "",
    status: employee.status || "Active",
  };
}

function normalizeDepartments(list) {
  return list.map((department, index) => ({
    ...department,
    head: department.head || department.head_name || "Not specified",
    employees: department.headcount ?? department.employees ?? 0,
    color:
      initialDepartments.find((item) => item.name === department.name)?.color ??
      initialDepartments[index % initialDepartments.length].color,
  }));
}

function App() {
  const [token, setToken] = useState(
    () => localStorage.getItem("nexoraToken") || "",
  );

  const [currentUser, setCurrentUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("nexoraUser") || "null");
    } catch {
      return null;
    }
  });

  const [activePage, setActivePage] = useState("Dashboard");
  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [notice, setNotice] = useState("");

  const [dashboardData, setDashboardData] = useState(null);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [dashboardError, setDashboardError] = useState("");

  const [employeeLoading, setEmployeeLoading] = useState(false);
  const [employeeError, setEmployeeError] = useState("");
  const [employeeTotal, setEmployeeTotal] = useState(0);
  const [employeePage, setEmployeePage] = useState(1);
  const [employeeTotalPages, setEmployeeTotalPages] = useState(1);

  const [departments, setDepartments] = useState(initialDepartments);
  const [formError, setFormError] = useState("");
  const [formLoading, setFormLoading] = useState(false);

  const [showDepartmentForm, setShowDepartmentForm] = useState(false);
  const [departmentFormLoading, setDepartmentFormLoading] = useState(false);
  const [departmentFormError, setDepartmentFormError] = useState("");
  const [newDepartmentName, setNewDepartmentName] = useState("");

  const [profile, setProfile] = useState(null);
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileNotice, setProfileNotice] = useState("");

  const canViewDashboard =
    currentUser?.role === "HR Admin" || currentUser?.role === "Manager";

  // Load dashboard statistics
  useEffect(() => {
    if (!token || !currentUser || !canViewDashboard) return;

    let cancelled = false;

    async function loadDashboard() {
      setDashboardLoading(true);
      setDashboardError("");

      try {
        const data = await apiRequest("/dashboard", token);
        if (!cancelled) setDashboardData(data);
      } catch (error) {
        if (!cancelled) setDashboardError(error.message);
      } finally {
        if (!cancelled) setDashboardLoading(false);
      }
    }

    loadDashboard();

    return () => {
      cancelled = true;
    };
  }, [token, currentUser, canViewDashboard]);

  // Load employees with search, department filter and pagination
  useEffect(() => {
    if (
      !token ||
      !currentUser ||
      !["HR Admin", "Manager"].includes(currentUser.role)
    ) {
      return;
    }

    let cancelled = false;

    async function loadEmployees() {
      setEmployeeLoading(true);
      setEmployeeError("");

      try {
        const params = new URLSearchParams({
          page: String(employeePage),
          limit: "10",
        });

        if (search.trim()) params.set("search", search.trim());

        if (departmentFilter !== "All") {
          const selectedDepartment = departments.find(
            (department) => department.name === departmentFilter,
          );

          if (selectedDepartment?.id != null) {
            params.set("dept", String(selectedDepartment.id));
          }
        }

        const data = await apiRequest(`/employees?${params.toString()}`, token);

        if (!cancelled) {
          setEmployees((data.employees || []).map(normalizeEmployee));
          setEmployeeTotal(data.total ?? 0);
          setEmployeeTotalPages(data.totalPages || 1);
        }
      } catch (error) {
        if (!cancelled) setEmployeeError(error.message);
      } finally {
        if (!cancelled) setEmployeeLoading(false);
      }
    }

    loadEmployees();

    return () => {
      cancelled = true;
    };
  }, [token, currentUser, search, employeePage, departmentFilter, departments]);

  // Load departments
  useEffect(() => {
    if (!token || !currentUser) return;

    let cancelled = false;

    async function loadDepartments() {
      try {
        const data = await apiRequest("/departments", token);
        const list = Array.isArray(data) ? data : data.departments || [];

        if (!cancelled && list.length) {
          setDepartments(normalizeDepartments(list));
        }
      } catch {
        // Keep fallback departments if the API is unavailable.
      }
    }

    loadDepartments();

    return () => {
      cancelled = true;
    };
  }, [token, currentUser]);

  function handleLogin(data) {
    localStorage.setItem("nexoraToken", data.token);
    localStorage.setItem("nexoraUser", JSON.stringify(data.user));

    setToken(data.token);
    setCurrentUser(data.user);
    setActivePage("Dashboard");
    setNotice("");
    setProfileNotice("");
    setProfileError("");
    setShowProfileForm(false);
  }

  function handleLogout() {
    localStorage.removeItem("nexoraToken");
    localStorage.removeItem("nexoraUser");

    setToken("");
    setCurrentUser(null);
    setDashboardData(null);
    setEmployees([]);
    setActivePage("Dashboard");
    setNotice("");
    setProfile(null);
    setShowProfileForm(false);
    setProfileError("");
    setProfileNotice("");
  }

  const activeCount = employees.filter(
    (employee) => employee.status === "Active",
  ).length;

  const filteredEmployees = employees;

  function openAddForm() {
    setEditingEmployee(null);
    setFormError("");
    setNotice("");
    setShowForm(true);
  }

  function openEditForm(employee) {
    setEditingEmployee(employee);
    setFormError("");
    setNotice("");
    setShowForm(true);
  }

  async function saveEmployee(event) {
    event.preventDefault();
    setFormError("");
    setFormLoading(true);

    const form = new FormData(event.currentTarget);

    const payload = {
      emp_code: String(form.get("emp_code") || "").trim(),
      name: String(form.get("name") || "").trim(),
      email: String(form.get("email") || "").trim(),
      phone: String(form.get("phone") || "").trim(),
      department_id: Number(form.get("department_id")),
      designation: String(form.get("designation") || "").trim(),
      salary: Number(form.get("salary")),
      join_date: form.get("join_date"),
    };

    if (!payload.department_id) {
      setFormError("Please select a department.");
      setFormLoading(false);
      return;
    }

    try {
      if (editingEmployee) {
        await apiRequest(`/employees/${editingEmployee.id}`, token, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        await apiRequest("/employees", token, {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }

      setShowForm(false);
      setEditingEmployee(null);
      setNotice(
        editingEmployee
          ? "Employee updated successfully."
          : "Employee added successfully.",
      );

      const params = new URLSearchParams({
        page: String(employeePage),
        limit: "10",
      });

      if (search.trim()) params.set("search", search.trim());

      if (departmentFilter !== "All") {
        const department = departments.find(
          (item) => item.name === departmentFilter,
        );
        if (department?.id != null) {
          params.set("dept", String(department.id));
        }
      }

      const data = await apiRequest(`/employees?${params.toString()}`, token);
      setEmployees((data.employees || []).map(normalizeEmployee));
      setEmployeeTotal(data.total ?? 0);
      setEmployeeTotalPages(data.totalPages || 1);
    } catch (error) {
      setFormError(error.message);
    } finally {
      setFormLoading(false);
    }
  }

  async function deleteEmployee(id) {
    const confirmed = window.confirm(
      "Are you sure you want to deactivate this employee?",
    );

    if (!confirmed) return;

    try {
      await apiRequest(`/employees/${id}/deactivate`, token, {
        method: "PUT",
      });

      setNotice("Employee deactivated successfully.");

      const params = new URLSearchParams({
        page: String(employeePage),
        limit: "10",
      });

      if (search.trim()) params.set("search", search.trim());

      if (departmentFilter !== "All") {
        const department = departments.find(
          (item) => item.name === departmentFilter,
        );
        if (department?.id != null) {
          params.set("dept", String(department.id));
        }
      }

      const data = await apiRequest(`/employees?${params.toString()}`, token);
      setEmployees((data.employees || []).map(normalizeEmployee));
      setEmployeeTotal(data.total ?? 0);
      setEmployeeTotalPages(data.totalPages || 1);
    } catch (error) {
      setNotice(error.message);
    }
  }

  async function addDepartment(event) {
    event.preventDefault();
    setDepartmentFormError("");

    const name = newDepartmentName.trim();

    if (!name) {
      setDepartmentFormError("Department name is required.");
      return;
    }

    setDepartmentFormLoading(true);

    try {
      await apiRequest("/departments", token, {
        method: "POST",
        body: JSON.stringify({ name }),
      });

      const data = await apiRequest("/departments", token);
      const list = Array.isArray(data) ? data : data.departments || [];

      setDepartments(normalizeDepartments(list));
      setNewDepartmentName("");
      setShowDepartmentForm(false);
      setNotice("Department created successfully.");
    } catch (error) {
      setDepartmentFormError(error.message);
    } finally {
      setDepartmentFormLoading(false);
    }
  }

  // Load the logged-in employee's profile before opening the editor
  async function openProfileForm() {
    setProfileError("");
    setProfileNotice("");

    try {
      const data = await apiRequest("/me", token);

      if (!data.user) {
        throw new Error("Profile details were not returned by the server.");
      }

      setProfile({
        name: data.user.name || "",
        email: data.user.email || "",
        phone: data.user.phone || "",
      });

      setShowProfileForm(true);
    } catch (error) {
      setProfileError(error.message || "Failed to load profile.");
    }
  }

  async function saveProfile(event) {
    event.preventDefault();
    setProfileError("");
    setProfileNotice("");
    setProfileLoading(true);

    try {
      const payload = {
        name: profile.name.trim(),
        email: profile.email.trim(),
        phone: profile.phone.trim(),
      };

      const data = await apiRequest("/me", token, {
        method: "PUT",
        body: JSON.stringify(payload),
      });

      const updatedUser = {
        ...currentUser,
        name: payload.name,
        email: payload.email,
      };

      setCurrentUser(updatedUser);
      localStorage.setItem("nexoraUser", JSON.stringify(updatedUser));
      setShowProfileForm(false);
      setProfileNotice(data.message || "Profile updated successfully.");
    } catch (error) {
      setProfileError(error.message || "Failed to update profile.");
    } finally {
      setProfileLoading(false);
    }
  }

  const pageDescription = {
    Dashboard: "Here is what is happening across your organization.",
    Employees: "Manage your team and employee information.",
    Departments: "Explore your organization's departments.",
    "My Profile": "View and update your personal account information.",
  };

  if (!token || !currentUser) {
    return <Login onLogin={handleLogin} />;
  }

  const userInitials = (currentUser.name || "NX")
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const userDepartment =
    departments.find(
      (department) =>
        String(department.id) === String(currentUser.departmentId),
    )?.name ||
    currentUser.department ||
    "Not specified";

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-logo">N</div>
          <div>
            <h2>NEXORA</h2>
            <p>Employee Management System</p>
          </div>
        </div>

        <div className="nav-heading">WORKSPACE</div>

        <nav className="navigation">
          {navigation.map((item) => (
            <button
              key={item.label}
              type="button"
              className={`nav-item ${
                activePage === item.label ? "active" : ""
              }`}
              onClick={() => {
                setActivePage(item.label);
                setNotice("");
                setProfileError("");
                setProfileNotice("");
                setShowProfileForm(false);
              }}
            >
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
              {activePage === item.label && (
                <span className="active-indicator" />
              )}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="help-card">
            <div className="help-icon">?</div>
            <strong>Need assistance?</strong>
            <p>Contact your HR administrator for support.</p>
          </div>

          <div className="sidebar-user">
            <div className="avatar avatar-purple">{userInitials}</div>
            <div className="sidebar-user-info">
              <strong>{currentUser.name}</strong>
              <span>{currentUser.role}</span>
            </div>
            <button
              type="button"
              className="more-icon"
              onClick={handleLogout}
              title="Log out"
              aria-label="Log out"
            >
              ↪
            </button>
          </div>
        </div>
      </aside>
      <main className="main-area">
        <header className="topbar">
          <div className="breadcrumb">
            <span>Workspace</span>
            <span className="breadcrumb-separator">/</span>
            <strong>{activePage}</strong>
          </div>

          <div className="topbar-right">
            <button
              type="button"
              className="notification-button"
              aria-label="Notifications"
              onClick={() => setNotice("You are all caught up.")}
            >
              ♧
              <span className="notification-dot" />
            </button>
            <div className="avatar avatar-purple">{userInitials}</div>
          </div>
        </header>

        <div className="page-content">
          <section className="page-heading">
            <div>
              <div className="eyebrow">NEXORA WORKSPACE</div>
              <h1>{activePage}</h1>
              <p>{pageDescription[activePage]}</p>
            </div>

            <div className="heading-actions">
              {activePage === "Employees" &&
                currentUser.role === "HR Admin" && (
                  <>
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={async () => {
                        try {
                          const response = await fetch(
                            `${API_URL}/employees/export`,
                            {
                              headers: {
                                Authorization: `Bearer ${token}`,
                              },
                            },
                          );

                          if (!response.ok) {
                            const data = await response
                              .json()
                              .catch(() => ({}));
                            throw new Error(
                              data.message || "Failed to export employees.",
                            );
                          }

                          const csv = await response.blob();
                          const url = URL.createObjectURL(csv);
                          const link = document.createElement("a");

                          link.href = url;
                          link.download = "nexora-employees.csv";
                          document.body.appendChild(link);
                          link.click();
                          link.remove();
                          URL.revokeObjectURL(url);

                          setNotice("Employee CSV exported successfully.");
                        } catch (error) {
                          setNotice(error.message);
                        }
                      }}
                    >
                      ↓ Export CSV
                    </button>

                    <button
                      type="button"
                      className="primary-button"
                      onClick={openAddForm}
                    >
                      ＋ Add employee
                    </button>
                  </>
                )}

              {activePage === "Departments" &&
                currentUser.role === "HR Admin" && (
                  <button
                    type="button"
                    className="primary-button"
                    onClick={() => {
                      setDepartmentFormError("");
                      setNewDepartmentName("");
                      setShowDepartmentForm(true);
                    }}
                  >
                    ＋ Add department
                  </button>
                )}
            </div>
          </section>

          {notice && (
            <div className="notice" role="status">
              <span>{notice}</span>
              <button
                type="button"
                onClick={() => setNotice("")}
                aria-label="Dismiss notification"
              >
                ×
              </button>
            </div>
          )}

          {/* Dashboard */}
          {activePage === "Dashboard" && (
            <>
              {canViewDashboard ? (
                <>
                  {dashboardLoading && (
                    <div className="notice" role="status">
                      Loading dashboard...
                    </div>
                  )}

                  {dashboardError && (
                    <div className="notice" role="alert">
                      {dashboardError}
                    </div>
                  )}

                  {dashboardData && (
                    <Dashboard
                      employees={employees}
                      activeCount={activeCount}
                      onNavigate={setActivePage}
                      dashboardData={dashboardData}
                    />
                  )}

                  {!dashboardLoading && !dashboardData && (
                    <section className="panel">
                      <h2>Dashboard unavailable</h2>
                      <p>Check that your backend is running, then retry.</p>
                      <button
                        type="button"
                        className="primary-button"
                        onClick={() => window.location.reload()}
                      >
                        Retry
                      </button>
                    </section>
                  )}
                </>
              ) : (
                <section className="panel">
                  <h2>Welcome, {currentUser.name}!</h2>
                  <p>
                    Your account is signed in. Dashboard statistics are
                    available to HR Admins and Managers.
                  </p>
                  <button
                    type="button"
                    className="primary-button"
                    onClick={() => setActivePage("My Profile")}
                  >
                    View my profile →
                  </button>
                </section>
              )}
            </>
          )}

          {/* Employees */}
          {activePage === "Employees" && (
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <h2>All employees</h2>
                  <p>Search and review your employee directory.</p>
                </div>
                <span className="count-badge">{employeeTotal} records</span>
              </div>

              <div className="filters">
                <div className="search-box">
                  <span>⌕</span>
                  <input
                    type="search"
                    placeholder="Search name, email, role..."
                    value={search}
                    onChange={(event) => {
                      setSearch(event.target.value);
                      setEmployeePage(1);
                    }}
                  />
                </div>

                <select
                  value={departmentFilter}
                  onChange={(event) => {
                    setDepartmentFilter(event.target.value);
                    setEmployeePage(1);
                  }}
                  aria-label="Filter by department"
                >
                  <option value="All">All departments</option>
                  {departments.map((department) => (
                    <option
                      key={department.id ?? department.name}
                      value={department.name}
                    >
                      {department.name}
                    </option>
                  ))}
                </select>
              </div>

              {employeeLoading && (
                <div className="notice" role="status">
                  Loading employees...
                </div>
              )}

              {employeeError && (
                <div className="notice" role="alert">
                  {employeeError}
                </div>
              )}

              {!employeeLoading && !employeeError && (
                <>
                  <EmployeeTable
                    employees={filteredEmployees}
                    onEdit={
                      currentUser.role === "HR Admin" ? openEditForm : undefined
                    }
                    onDelete={
                      currentUser.role === "HR Admin"
                        ? deleteEmployee
                        : undefined
                    }
                  />

                  {filteredEmployees.length === 0 && (
                    <div className="empty-state">
                      <div>⌕</div>
                      <strong>No employees found</strong>
                      <p>Try a different search or department.</p>
                    </div>
                  )}

                  <div className="pagination">
                    <span>
                      Page {employeePage} of {employeeTotalPages}
                    </span>
                    <div className="pagination-actions">
                      <button
                        type="button"
                        className="secondary-button"
                        disabled={employeePage <= 1}
                        onClick={() => setEmployeePage((page) => page - 1)}
                      >
                        Previous
                      </button>
                      <button
                        type="button"
                        className="secondary-button"
                        disabled={employeePage >= employeeTotalPages}
                        onClick={() => setEmployeePage((page) => page + 1)}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </>
              )}
            </section>
          )}

          {/* Departments */}
          {activePage === "Departments" && (
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <h2>All departments</h2>
                  <p>Review the departments in your organization.</p>
                </div>
                <span className="count-badge">
                  {departments.length} departments
                </span>
              </div>

              <div className="department-grid">
                {departments.map((department) => (
                  <article
                    className="department-card"
                    key={department.id ?? department.name}
                  >
                    <div
                      className="department-card-icon"
                      style={{ background: department.color || "#6366f1" }}
                    >
                      {department.name.slice(0, 1).toUpperCase()}
                    </div>
                    <h3>{department.name}</h3>
                    <p>Department head: {department.head || "Not specified"}</p>
                    <div className="department-card-footer">
                      <strong>
                        {department.headcount ?? department.employees ?? 0}
                      </strong>
                      <span>Employees</span>
                    </div>
                  </article>
                ))}
              </div>

              {departments.length === 0 && (
                <div className="empty-state">
                  <strong>No departments found</strong>
                  <p>Add a department to get started.</p>
                </div>
              )}
            </section>
          )}

          {/* My Profile */}
          {activePage === "My Profile" && (
            <section className="panel profile-panel">
              <div className="profile-cover" />

              <div className="profile-body">
                <div className="profile-avatar">{userInitials}</div>

                <div className="profile-title">
                  <div>
                    <h2>{currentUser.name}</h2>
                    <p>{currentUser.role}</p>
                  </div>
                  <span className="status-badge active">Signed in</span>
                </div>

                {profileNotice && (
                  <div className="notice" role="status">
                    {profileNotice}
                    <button
                      type="button"
                      onClick={() => setProfileNotice("")}
                      aria-label="Dismiss notification"
                    >
                      ×
                    </button>
                  </div>
                )}

                {profileError && !showProfileForm && (
                  <div className="notice" role="alert">
                    {profileError}
                  </div>
                )}

                {!showProfileForm ? (
                  <>
                    <div className="profile-details">
                      <div>
                        <span>EMAIL ADDRESS</span>
                        <strong>{currentUser.email}</strong>
                      </div>
                      <div>
                        <span>EMPLOYEE ID</span>
                        <strong>
                          {currentUser.employeeId || "Not available"}
                        </strong>
                      </div>
                      <div>
                        <span>ROLE</span>
                        <strong>{currentUser.role}</strong>
                      </div>
                      <div>
                        <span>DEPARTMENT</span>
                        <strong>{userDepartment}</strong>
                      </div>
                    </div>

                    <p className="profile-note">
                      Keep your personal contact details up to date.
                    </p>

                    <button
                      type="button"
                      className="primary-button"
                      onClick={openProfileForm}
                    >
                      Edit Profile
                    </button>
                  </>
                ) : (
                  <form className="profile-edit-form" onSubmit={saveProfile}>
                    <h3>Edit Profile</h3>
                    <p>Update your name and contact information below.</p>

                    {profileError && (
                      <div className="notice" role="alert">
                        {profileError}
                      </div>
                    )}

                    <label htmlFor="profile-name">Full name</label>
                    <input
                      id="profile-name"
                      type="text"
                      required
                      maxLength={100}
                      value={profile?.name || ""}
                      onChange={(event) =>
                        setProfile((previous) => ({
                          ...previous,
                          name: event.target.value,
                        }))
                      }
                    />

                    <label htmlFor="profile-email">Email address</label>
                    <input
                      id="profile-email"
                      type="email"
                      required
                      value={profile?.email || ""}
                      onChange={(event) =>
                        setProfile((previous) => ({
                          ...previous,
                          email: event.target.value,
                        }))
                      }
                    />

                    <label htmlFor="profile-phone">Phone number</label>
                    <input
                      id="profile-phone"
                      type="tel"
                      maxLength={30}
                      value={profile?.phone || ""}
                      onChange={(event) =>
                        setProfile((previous) => ({
                          ...previous,
                          phone: event.target.value,
                        }))
                      }
                    />

                    <div className="modal-actions">
                      <button
                        type="button"
                        className="secondary-button"
                        disabled={profileLoading}
                        onClick={() => {
                          setShowProfileForm(false);
                          setProfileError("");
                        }}
                      >
                        Cancel
                      </button>

                      <button
                        type="submit"
                        className="primary-button"
                        disabled={profileLoading}
                      >
                        {profileLoading ? "Saving..." : "Save Changes"}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </section>
          )}
        </div>
      </main>
      {/* Add Employee / Edit Employee modal */}
      {showForm && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !formLoading) {
              setShowForm(false);
              setEditingEmployee(null);
            }
          }}
        >
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="employee-form-title"
          >
            <div className="modal-heading">
              <div>
                <h2 id="employee-form-title">
                  {editingEmployee ? "Edit employee" : "Add employee"}
                </h2>
                <p>
                  {editingEmployee
                    ? "Update the employee's information."
                    : "Enter the employee's details."}
                </p>
              </div>

              <button
                type="button"
                className="close-button"
                onClick={() => {
                  setShowForm(false);
                  setEditingEmployee(null);
                }}
                aria-label="Close form"
                disabled={formLoading}
              >
                ×
              </button>
            </div>

            <form
              key={editingEmployee?.id ?? "new-employee"}
              onSubmit={saveEmployee}
            >
              {formError && (
                <div className="notice" role="alert">
                  {formError}
                </div>
              )}

              <label>
                Employee code
                <input
                  name="emp_code"
                  required
                  placeholder="e.g. EMP006"
                  defaultValue={editingEmployee?.emp_code || ""}
                />
              </label>

              <label>
                Full name
                <input
                  name="name"
                  required
                  placeholder="Enter full name"
                  defaultValue={editingEmployee?.name || ""}
                />
              </label>

              <label>
                Email address
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="name@company.com"
                  defaultValue={editingEmployee?.email || ""}
                />
              </label>

              <label>
                Phone number
                <input
                  name="phone"
                  type="tel"
                  placeholder="Enter phone number"
                  defaultValue={editingEmployee?.phone || ""}
                />
              </label>

              <label>
                Department
                <select
                  name="department_id"
                  required
                  defaultValue={
                    editingEmployee
                      ? String(
                          editingEmployee.department_id ??
                            departments.find(
                              (department) =>
                                department.name === editingEmployee.department,
                            )?.id ??
                            "",
                        )
                      : ""
                  }
                >
                  <option value="" disabled>
                    Select department
                  </option>

                  {departments
                    .filter((department) => department.id != null)
                    .map((department) => (
                      <option key={department.id} value={department.id}>
                        {department.name}
                      </option>
                    ))}
                </select>
              </label>

              <label>
                Designation
                <input
                  name="designation"
                  required
                  placeholder="Enter job title"
                  defaultValue={
                    editingEmployee?.designation || editingEmployee?.role || ""
                  }
                />
              </label>

              <label>
                Salary
                <input
                  name="salary"
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  placeholder="Enter salary"
                  defaultValue={editingEmployee?.salary ?? ""}
                />
              </label>

              <label>
                Joining date
                <input
                  name="join_date"
                  type="date"
                  required
                  defaultValue={
                    editingEmployee?.join_date
                      ? String(editingEmployee.join_date).slice(0, 10)
                      : ""
                  }
                />
              </label>

              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingEmployee(null);
                    setFormError("");
                  }}
                  disabled={formLoading}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary-button"
                  disabled={formLoading}
                >
                  {formLoading
                    ? "Saving..."
                    : editingEmployee
                      ? "Save changes"
                      : "Add employee"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* Add Department modal */}
      {showDepartmentForm && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget &&
              !departmentFormLoading
            ) {
              setShowDepartmentForm(false);
            }
          }}
        >
          <section
            className="modal department-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="department-form-title"
          >
            <div className="modal-heading">
              <div>
                <h2 id="department-form-title">Add department</h2>
                <p>Create a new department in your organization.</p>
              </div>

              <button
                type="button"
                className="close-button"
                onClick={() => setShowDepartmentForm(false)}
                disabled={departmentFormLoading}
                aria-label="Close form"
              >
                ×
              </button>
            </div>

            <form onSubmit={addDepartment}>
              {departmentFormError && (
                <div className="notice" role="alert">
                  {departmentFormError}
                </div>
              )}

              <label>
                Department name
                <input
                  autoFocus
                  value={newDepartmentName}
                  onChange={(event) => setNewDepartmentName(event.target.value)}
                  placeholder="e.g. Customer Support"
                  maxLength={100}
                  required
                />
              </label>

              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setShowDepartmentForm(false)}
                  disabled={departmentFormLoading}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary-button"
                  disabled={departmentFormLoading}
                >
                  {departmentFormLoading ? "Creating..." : "Create department"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

function Dashboard({ employees, activeCount, onNavigate, dashboardData }) {
  const stats = [
    {
      label: "Total employees",
      value: dashboardData.totalEmployees ?? employees.length,
      icon: "♙",
      theme: "violet",
      note: "Across your organization",
    },
    {
      label: "Active employees",
      value: dashboardData.activeEmployees ?? activeCount,
      icon: "✓",
      theme: "green",
      note: "Currently active",
    },
    {
      label: "Departments",
      value: dashboardData.departments?.length ?? 0,
      icon: "▦",
      theme: "blue",
      note: "Organization departments",
    },
    {
      label: "Inactive employees",
      value: dashboardData.inactiveEmployees ?? 0,
      icon: "◷",
      theme: "orange",
      note: "Currently inactive",
    },
  ];

  const departmentList = dashboardData.departments || [];

  const totalHeadcount = departmentList.reduce(
    (total, department) => total + (department.headcount || 0),
    0,
  );

  return (
    <>
      <section className="stats-grid">
        {stats.map((stat) => (
          <article className="stat-card" key={stat.label}>
            <div className={`stat-icon ${stat.theme}`}>{stat.icon}</div>
            <p>{stat.label}</p>
            <div className="stat-value">{stat.value}</div>
            <span className="stat-note">{stat.note}</span>
          </article>
        ))}
      </section>

      <section className="dashboard-grid">
        <div className="panel recent-panel">
          <div className="panel-heading">
            <div>
              <h2>Recent employees</h2>
              <p>A quick look at your employee directory.</p>
            </div>
            <button
              type="button"
              className="text-button"
              onClick={() => onNavigate("Employees")}
            >
              View all →
            </button>
          </div>

          <EmployeeTable employees={employees.slice(0, 4)} compact />
        </div>

        <div className="panel overview-panel">
          <div className="panel-heading">
            <div>
              <h2>Department overview</h2>
              <p>Employee distribution</p>
            </div>
          </div>

          {departmentList.map((department, index) => {
            const count = department.headcount || 0;
            const percent = totalHeadcount ? (count / totalHeadcount) * 100 : 0;

            const color =
              initialDepartments.find((item) => item.name === department.name)
                ?.color ??
              initialDepartments[index % initialDepartments.length].color;

            return (
              <div
                className="progress-item"
                key={department.id ?? department.name}
              >
                <div className="progress-label">
                  <span>{department.name}</span>
                  <strong>{count}</strong>
                </div>

                <div className="progress-track">
                  <div
                    className="progress-fill"
                    style={{ width: `${percent}%`, background: color }}
                  />
                </div>
              </div>
            );
          })}

          <button
            type="button"
            className="secondary-button full-button"
            onClick={() => onNavigate("Departments")}
          >
            Explore departments →
          </button>
        </div>
      </section>
    </>
  );
}

function EmployeeTable({ employees, onDelete, onEdit, compact = false }) {
  return (
    <div className="table-wrapper">
      <table className="employee-table">
        <thead>
          <tr>
            <th>EMPLOYEE</th>
            {!compact && <th>DEPARTMENT</th>}
            <th>ROLE</th>
            <th>STATUS</th>
            {!compact && (onEdit || onDelete) && <th>ACTION</th>}
          </tr>
        </thead>

        <tbody>
          {employees.map((employee) => (
            <tr key={employee.id}>
              <td>
                <div className="employee-cell">
                  <div
                    className={`avatar avatar-${
                      Math.abs(Number(employee.id) || 0) % 4
                    }`}
                  >
                    {(employee.name || "NA")
                      .split(" ")
                      .map((part) => part[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase()}
                  </div>

                  <div className="employee-identity">
                    <strong>{employee.name}</strong>
                    <span>{employee.email}</span>
                  </div>
                </div>
              </td>

              {!compact && <td>{employee.department}</td>}
              <td>{employee.role}</td>

              <td>
                <span
                  className={`status-badge ${
                    employee.status === "Active" ? "active" : "leave"
                  }`}
                >
                  <span className="status-dot" />
                  {employee.status}
                </span>
              </td>

              {!compact && (onEdit || onDelete) && (
                <td>
                  <div className="employee-actions">
                    {onEdit && (
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => onEdit(employee)}
                        aria-label={`Edit ${employee.name}`}
                        title="Edit employee"
                      >
                        Edit
                      </button>
                    )}

                    {onDelete && (
                      <button
                        type="button"
                        className="delete-button"
                        onClick={() => onDelete(employee.id)}
                        aria-label={`Deactivate ${employee.name}`}
                        title="Deactivate employee"
                      >
                        ×
                      </button>
                    )}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default App;
