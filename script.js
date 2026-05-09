
let students = [];
let subjects = [];
let classes = [];
let assignments = [];
let school = { classes: {} };

const studentForm = document.getElementById("studentForm");
const subjectForm = document.getElementById("subjectForm");
const classForm = document.getElementById("classForm");
const assignForm = document.getElementById("assignForm");

const studentList = document.getElementById("studentList");
const subjectList = document.getElementById("subjectList");
const classList = document.getElementById("classList");
const assignList = document.getElementById("assignList");
const subjectCheckboxes = document.getElementById("subjectCheckboxes");

const exportJsonBtn = document.getElementById("exportJsonBtn");
const importJsonBtn = document.getElementById("importJsonBtn");
const exportExcelBtn = document.getElementById("exportExcelBtn");
const exportByClassBtn = document.getElementById("exportByClassBtn");

// Edit state
let studentEditIndex = null;
let subjectEditIndex = null;
let classEditIndex = null;
let assignEditIndex = null; 

// Controls (search + sort)
const controlsContainer = document.createElement("div");
controlsContainer.style.textAlign = "center";
controlsContainer.style.marginTop = "12px";
controlsContainer.style.marginBottom = "6px";

const searchBar = document.createElement("input");
searchBar.type = "text";
searchBar.id = "searchBar";
searchBar.placeholder = "Search class or student name...";
searchBar.style.marginRight = "12px";
searchBar.style.padding = "8px 12px";
searchBar.style.borderRadius = "20px";
searchBar.style.border = "1px solid #ccc";
searchBar.style.width = "45%";

const sortSelect = document.createElement("select");
sortSelect.id = "sortSelect";
sortSelect.style.padding = "8px 10px";
sortSelect.style.borderRadius = "6px";
sortSelect.style.border = "1px solid #ccc";


const sortOptions = [
  { label: "Original order", value: "default" },
  { label: "Student A → Z", value: "az" },
  { label: "Student Z → A", value: "za" },
  { label: "Sort by Class", value: "class" },
  { label: "Sort by Subject", value: "subject" }
];

sortOptions.forEach(({ label, value }) => {
  const opt = document.createElement("option");
  opt.value = value;
  opt.textContent = label;
  sortSelect.appendChild(opt);
});

// ["Original order", "Student A → Z", "Student Z → A", "Sort by Class"].forEach((label, idx) => {
//   const opt = document.createElement("option");
//   opt.value = ["default", "az", "za", "class"][idx];
//   opt.textContent = label;
//   sortSelect.appendChild(opt);
// });


assignForm.insertAdjacentElement("afterend", controlsContainer);
controlsContainer.appendChild(searchBar);
controlsContainer.appendChild(sortSelect);

searchBar.addEventListener("input", () => renderAssignments(searchBar.value, sortSelect.value));
sortSelect.addEventListener("change", () => renderAssignments(searchBar.value, sortSelect.value));

// 
// Inline field-error & modal helpers
// 

// Add container for modals (simple)
const modalOverlay = document.createElement("div");
modalOverlay.id = "js-error-modal";
Object.assign(modalOverlay.style, {
  position: "fixed",
  inset: "0",
  display: "none",
  alignItems: "center",
  justifyContent: "center",
  background: "rgba(0,0,0,0.4)",
  zIndex: 9999,
});
const modalBox = document.createElement("div");
Object.assign(modalBox.style, {
  background: "#fff",
  padding: "18px",
  borderRadius: "8px",
  boxShadow: "0 6px 18px rgba(0,0,0,0.2)",
  maxWidth: "380px",
  width: "90%",
  textAlign: "center",
});
const modalMsg = document.createElement("div");
modalMsg.style.marginBottom = "12px";
modalMsg.textContent = "There are some errors";
const modalOk = document.createElement("button");
modalOk.textContent = "OK";
Object.assign(modalOk.style, { padding: "8px 12px", borderRadius: "6px", cursor: "pointer" });
modalOk.addEventListener("click", () => (modalOverlay.style.display = "none"));
modalBox.appendChild(modalMsg);
modalBox.appendChild(modalOk);
modalOverlay.appendChild(modalBox);
document.body.appendChild(modalOverlay);

function showModal(message = "There are some errors") {
  modalMsg.textContent = message;
  modalOverlay.style.display = "flex";
}

// showMessage (success or small error notices next to form)
function showMessage(containerEl, text, type = "success") {
  const div = document.createElement("div");
  div.className = `js-message js-message-${type}`;
  div.textContent = text;
  // basic styles
  div.style.padding = "8px 12px";
  div.style.marginTop = "8px";
  div.style.borderRadius = "6px";
  div.style.maxWidth = "480px";
  div.style.fontSize = "14px";
  if (type === "success") {
    div.style.background = "#e6ffed";
    div.style.border = "1px solid #8be39b";
    div.style.color = "#045a18";
  } else {
    div.style.background = "#ffecec";
    div.style.border = "1px solid #f5a4a4";
    div.style.color = "#7a0606";
  }
  containerEl.appendChild(div);
  // remove after 2.5s
  setTimeout(() => {
    div.style.transition = "opacity 300ms";
    div.style.opacity = 0;
    setTimeout(() => div.remove(), 350);
  }, 2500);
}

// inline field error
function showFieldError(fieldEl, message) {
  // remove any existing error for this field
  clearFieldError(fieldEl);
  const err = document.createElement("div");
  err.className = "js-field-error";
  err.textContent = message;
  Object.assign(err.style, {
    color: "#b00020",
    fontSize: "13px",
    marginTop: "6px",
  });
  // place after the field; if fieldEl is a container, append, else insert after
  if (fieldEl instanceof HTMLDivElement || fieldEl.tagName === "DIV") {
    fieldEl.appendChild(err);
  } else {
    fieldEl.insertAdjacentElement("afterend", err);
  }
}

function clearFieldError(fieldEl) {
  const next = fieldEl.nextElementSibling;
  if (next && next.classList && next.classList.contains("js-field-error")) next.remove();
}

// clear all field errors in a container form
function clearAllFieldErrors(formEl) {
  const errs = formEl.querySelectorAll(".js-field-error");
  errs.forEach((e) => e.remove());
}

// small helper to escape user strings for HTML safety
function escapeHtml(str) {
  if (!str && str !== 0) return "";
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

// 
// Renderers
// 
function renderStudents() {
  studentList.innerHTML = students
    .map((s, i) => `
      <li class="row-item">
        <span class="item-text">${escapeHtml(s.name)} ${s.id ? `(ID: ${escapeHtml(s.id)})` : ""} ${s.age ? `(Age: ${escapeHtml(s.age)})` : ""}</span>
        <span class="item-actions">
          <button onclick="startEditStudent(${i})">Edit</button>
          <button onclick="deleteStudent(${i})">Delete</button>
        </span>
      </li>
    `)
    .join("");
  updateSelectOptions();
}

function renderSubjects() {
  subjectList.innerHTML = subjects
    .map((s, i) => `
      <li class="row-item">
        <span class="item-text">${escapeHtml(s.name)} ${s.code ? `(${escapeHtml(s.code)})` : ""}</span>
        <span class="item-actions">
          <button onclick="startEditSubject(${i})">Edit</button>
          <button onclick="deleteSubject(${i})">Delete</button>
        </span>
      </li>
    `)
    .join("");
  renderSubjectCheckboxes();
}

function renderClasses() {
  classList.innerHTML = classes
    .map((c, i) => `
      <li class="row-item">
        <span class="item-text">${escapeHtml(c.name)}</span>
        <span class="item-actions">
          <button onclick="startEditClass(${i})">Edit</button>
          <button onclick="deleteClass(${i})">Delete</button>
        </span>
      </li>
    `)
    .join("");
  updateSelectOptions();
}

/**
 * renderAssignments(filterText, sortMode)
 */
function renderAssignments(filterText = "", sortMode = "default") {
  let rows = assignments.map((a) => ({ ...a }));

  if (filterText && filterText.trim() !== "") {
  const q = filterText.toLowerCase();

  // Step 1: detect class match
  const matchedClass = classes.find((c) =>
    q.includes(c.name.toLowerCase())
  );

  if (matchedClass) {
    // Lock results to this class
    rows = rows.filter(
      (a) => a.className.toLowerCase() === matchedClass.name.toLowerCase()
    );

    // Remove class name from query → remaining text used for student search
    const remaining = q.replace(matchedClass.name.toLowerCase(), "").trim();

    if (remaining) {
      rows = rows.filter((a) =>
        a.student.toLowerCase().includes(remaining)
      );
    }
  } else {
    // No class detected → normal student search
    rows = rows.filter((a) =>
      a.student.toLowerCase().includes(q)
    );
  }
}



  if (sortMode === "az") {
    rows.sort((x, y) => x.student.localeCompare(y.student));
  } else if (sortMode === "za") {
    rows.sort((x, y) => y.student.localeCompare(x.student));
  } else if (sortMode === "class") {
    rows.sort((x, y) => {
      const c = x.className.localeCompare(y.className);
      if (c !== 0) return c;
      return x.student.localeCompare(y.student);
    });
  } else if (sortMode === "subject") {
  rows.sort((x, y) => {
    const subX = (x.subjects || []).join(", ").toLowerCase();
    const subY = (y.subjects || []).join(", ").toLowerCase();

    const s = subX.localeCompare(subY);
    if (s !== 0) return s;

    // fallback to student name for consistent ordering
    return x.student.localeCompare(y.student);
  });
}


  if (!rows.length) {
    assignList.innerHTML = "<p style='text-align:center'>No assignments yet.</p>";
    return;
  }

  const tbodyHtml = rows
    .map((r) => {
      const key = `${r.student}|${r.className}|${JSON.stringify(r.subjects)}`;
      const originalIndex = assignments.findIndex(
        (a) => `${a.student}|${a.className}|${JSON.stringify(a.subjects)}` === key
      );

      const deleteBtn =
        originalIndex >= 0
          ? `<button onclick="deleteAssignment(${originalIndex})">Delete</button>`
          : `<button disabled>Delete</button>`;

      // Add Edit button
      const editBtn =
        originalIndex >= 0
          ? `<button onclick="startEditAssignment(${originalIndex})">Edit</button>`
          : `<button disabled>Edit</button>`;

      return `
        <tr>
          <td style="text-align:left;padding:8px 10px">${escapeHtml(r.student)}</td>
          <td style="text-align:center;padding:8px 10px">${escapeHtml(r.className)}</td>
          <td style="text-align:left;padding:8px 10px">${escapeHtml(r.subjects.join(", "))}</td>
          <td style="text-align:center;padding:8px 10px">${editBtn} ${deleteBtn}</td>
        </tr>
      `;
    })
    .join("");

  assignList.innerHTML = `
    <table class="assign-table" style="width:100%;border-collapse:collapse;margin-top:12px">
      <thead>
        <tr>
          <th style="padding:8px 10px;border-bottom:1px solid #ddd">Student</th>
          <th style="padding:8px 10px;border-bottom:1px solid #ddd">Class</th>
          <th style="padding:8px 10px;border-bottom:1px solid #ddd">Subjects</th>
          <th style="padding:8px 10px;border-bottom:1px solid #ddd">Actions</th>
        </tr>
      </thead>
      <tbody>
        ${tbodyHtml}
      </tbody>
    </table>
  `;
}

// UI helpers
function renderSubjectCheckboxes() {
  subjectCheckboxes.innerHTML = subjects
    .map((s) => `<label style="margin-right:8px"><input type="checkbox" value="${escapeHtml(s.name)}"> ${escapeHtml(s.name)}</label>`)
    .join("<br>");
}

function updateSelectOptions() {
  const assignStudent = document.getElementById("assignStudent");
  const assignClass = document.getElementById("assignClass");
  if (!assignStudent || !assignClass) return;

  assignStudent.innerHTML = students.map((s) => `<option value="${escapeHtml(s.name)}">${escapeHtml(s.name)}</option>`).join("");
  assignClass.innerHTML = classes.map((c) => `<option value="${escapeHtml(c.name)}">${escapeHtml(c.name)}</option>`).join("");
}

// 
// CRUD and editing
// 

// Students
studentForm.addEventListener("submit", (e) => {
  e.preventDefault();
  clearAllFieldErrors(studentForm);

  const nameEl = document.getElementById("studentName");
  const idEl = document.getElementById("studentId");
  const ageEl = document.getElementById("studentAge");

  const name = (nameEl.value || "").trim();
  const id = (idEl.value || "").trim();
  const age = (ageEl.value || "").trim();

  let hasError = false;

  if (!name) {
    showFieldError(nameEl, "Please enter student name");
    hasError = true;
  }
  if (!id) {
    showFieldError(idEl, "Please enter student ID");
    hasError = true;
  }
  if (!age) {
    showFieldError(ageEl, "Please enter student age");
    hasError = true;
  }
  // Age must be a whole number
  if (age && !/^\d+$/.test(age)) {
    showFieldError(ageEl, "Age must be a whole number");
    hasError = true;
  }


  // Check duplicate ID
const isDuplicateId = students.some((stu, idx) => {
  return stu.id === id && idx !== studentEditIndex;
});

if (isDuplicateId) {
  showFieldError(idEl, "This ID already exists");
  showModal("Student ID must be unique");
  return;
}


  if (hasError) {
    showModal("There are some errors");
    return;
  }

  if (studentEditIndex === null) {
    students.push({ name, id, age });
    showMessage(studentForm, "Student successfully added", "success");
  } else {
    const oldName = students[studentEditIndex].name;
    students[studentEditIndex] = { name, id, age };

    // update assignments where student name used
    assignments.forEach((a) => {
      if (a.student === oldName) a.student = name;
    });
    // update school.classes entries
    for (const cls of Object.keys(school.classes)) {
      school.classes[cls] = school.classes[cls].map((st) => {
        if (st.name === oldName) return { ...st, name, subjects: st.subjects || [] };
        return st;
      });
    }

    showMessage(studentForm, "Student successfully updated", "success");
    studentEditIndex = null;
    studentForm.querySelector("button[type=submit]").textContent = "Add Student";
  }

  renderStudents();
  renderAssignments(searchBar.value, sortSelect.value);
  studentForm.reset();
});

// start edit student (in-place)
window.startEditStudent = function (i) {
  const s = students[i];
  document.getElementById("studentName").value = s.name;
  document.getElementById("studentId").value = s.id || "";
  document.getElementById("studentAge").value = s.age || "";
  studentEditIndex = i;
  studentForm.querySelector("button[type=submit]").textContent = "Save Student";
  document.getElementById("studentName").focus();
};

window.deleteStudent = function (i) {
  if (!confirm("Delete student?")) return;
  const name = students[i].name;
  assignments = assignments.filter((a) => a.student !== name);
  for (const clsName of Object.keys(school.classes)) {
    school.classes[clsName] = school.classes[clsName].filter((st) => st.name !== name);
    if (school.classes[clsName].length === 0) delete school.classes[clsName];
  }
  students.splice(i, 1);
  renderStudents();
  renderAssignments(searchBar.value, sortSelect.value);
};

// Subjects
subjectForm.addEventListener("submit", (e) => {
  e.preventDefault();
  clearAllFieldErrors(subjectForm);

  const nameEl = document.getElementById("subjectName");
  const codeEl = document.getElementById("subjectCode");
  const name = (nameEl.value || "").trim();
  const code = (codeEl.value || "").trim();

  let hasError = false;

  // Duplicate SUBJECT NAME check
const isDuplicateName = subjects.some((sub, idx) => {
  return (
    sub.name.toLowerCase() === name.toLowerCase() &&
    idx !== subjectEditIndex
  );
});

if (isDuplicateName) {
  showFieldError(nameEl, "This subject name already exists");
  hasError = true;
}

// Duplicate SUBJECT CODE check
const isDuplicateCode = subjects.some((sub, idx) => {
  return (
    sub.code.toLowerCase() === code.toLowerCase() &&
    idx !== subjectEditIndex
  );
});

if (isDuplicateCode) {
  showFieldError(codeEl, "This subject code already exists");
  hasError = true;
}



  // let hasError = false;
  if (!name) {
    showFieldError(nameEl, "Please enter subject name");
    hasError = true;
  }
  if (!code) {
    showFieldError(codeEl, "Please enter subject code");
    hasError = true;
  }


  if (hasError) {
    showModal("There are some errors");
    return;
  }

  if (subjectEditIndex === null) {
    subjects.push({ name, code });
    showMessage(subjectForm, "Subject successfully added", "success");
  } else {
    const oldName = subjects[subjectEditIndex].name;
    subjects[subjectEditIndex] = { name, code };

    // replace in assignments
    assignments.forEach((a) => {
      a.subjects = (a.subjects || []).map((sub) => (sub === oldName ? name : sub));
    });
    // replace in school.classes
    for (const clsName of Object.keys(school.classes)) {
      school.classes[clsName].forEach((st) => {
        st.subjects = (st.subjects || []).map((sub) => (sub === oldName ? name : sub));
      });
    }

    showMessage(subjectForm, "Subject successfully updated", "success");
    subjectEditIndex = null;
    subjectForm.querySelector("button[type=submit]").textContent = "Add Subject";
  }

  renderSubjects();
  renderAssignments(searchBar.value, sortSelect.value);
  subjectForm.reset();
});

window.startEditSubject = function (i) {
  const s = subjects[i];
  document.getElementById("subjectName").value = s.name;
  document.getElementById("subjectCode").value = s.code || "";
  subjectEditIndex = i;
  subjectForm.querySelector("button[type=submit]").textContent = "Save Subject";
  document.getElementById("subjectName").focus();
};

window.deleteSubject = function (i) {
  if (!confirm("Delete subject?")) return;
  const name = subjects[i].name;
  assignments.forEach((a) => {
    a.subjects = (a.subjects || []).filter((sub) => sub !== name);
  });
  for (const clsName of Object.keys(school.classes)) {
    school.classes[clsName].forEach((st) => {
      st.subjects = (st.subjects || []).filter((sub) => sub !== name);
    });
  }
  subjects.splice(i, 1);
  renderSubjects();
  renderAssignments(searchBar.value, sortSelect.value);
};

// Classes
classForm.addEventListener("submit", (e) => {
  e.preventDefault();
  clearAllFieldErrors(classForm);

  const nameEl = document.getElementById("className");
  const name = (nameEl.value || "").trim();

  let hasError = false;
  if (!name) {
    showFieldError(nameEl, "Please enter class name");
    hasError = true;
  }
const isDuplicateClass = classes.some((cls, idx) => {
  return cls.name.toLowerCase() === name.toLowerCase() && idx !== classEditIndex;
});

if (isDuplicateClass) {
  showFieldError(nameEl, "This class already exists");
  showModal("Class names must be unique");
  return;
}

  if (hasError) {
    showModal("There are some errors");
    return;
  }

  if (classEditIndex === null) {
    classes.push({ name });
    showMessage(classForm, "Class successfully added", "success");
  } else {
    const oldName = classes[classEditIndex].name;
    classes[classEditIndex] = { name };

    // update assignments that referenced old class name
    assignments.forEach((a) => {
      if (a.className === oldName) a.className = name;
    });

    // move school.classes entry (rename key)
    if (school.classes[oldName]) {
      school.classes[name] = school.classes[oldName];
      delete school.classes[oldName];
    }

    showMessage(classForm, "Class successfully updated", "success");
    classEditIndex = null;
    classForm.querySelector("button[type=submit]").textContent = "Add Class";
  }

  renderClasses();
  renderAssignments(searchBar.value, sortSelect.value);
  classForm.reset();
});

window.startEditClass = function (i) {
  const c = classes[i];
  document.getElementById("className").value = c.name;
  classEditIndex = i;
  classForm.querySelector("button[type=submit]").textContent = "Save Class";
  document.getElementById("className").focus();
};

window.deleteClass = function (i) {
  if (!confirm("Delete class?")) return;
  const className = classes[i].name;
  assignments = assignments.filter((a) => a.className !== className);
  delete school.classes[className];
  classes.splice(i, 1);
  renderClasses();
  renderAssignments(searchBar.value, sortSelect.value);
};

// Assignments (add or save)
assignForm.addEventListener("submit", (e) => {
  e.preventDefault();
  clearAllFieldErrors(assignForm);

  const studentEl = document.getElementById("assignStudent");
  const classEl = document.getElementById("assignClass");
  const student = (studentEl.value || "").trim();
  const className = (classEl.value || "").trim();
  const selected = Array.from(subjectCheckboxes.querySelectorAll("input:checked")).map((ch) => ch.value);

  let hasError = false;
  if (!student) {
    showFieldError(studentEl, "Please choose a student");
    hasError = true;
  }
  if (!className) {
    showFieldError(classEl, "Please choose a class");
    hasError = true;
  }
  // subject checkbox container error message
  // place error after subjectCheckboxes container
  if (!selected.length) {
    showFieldError(subjectCheckboxes, "Please select at least one subject");
    hasError = true;
  }

  if (hasError) {
    showModal("There are some errors");
    return;
  }

  if (assignEditIndex === null) {
    // add new assignment, merging if exact student+class exists
    const existing = assignments.find((a) => a.student === student && a.className === className);
    if (existing) {
      existing.subjects = Array.from(new Set([...(existing.subjects || []), ...selected]));
    } else {
      assignments.push({ student, className, subjects: selected });
    }

    // Update school.classes
    if (!school.classes[className]) school.classes[className] = [];
    const classArr = school.classes[className];
    const existingStudent = classArr.find((s) => s.name === student);
    if (existingStudent) {
      existingStudent.subjects = Array.from(new Set([...(existingStudent.subjects || []), ...selected]));
    } else {
      classArr.push({ name: student, subjects: selected });
    }

    showMessage(assignForm, "Assignment successfully added", "success");
  } else {
    // SAVE edited assignment (full-edit allowed)
    const oldAssignment = assignments[assignEditIndex];
    const oldStudent = oldAssignment.student;
    const oldClass = oldAssignment.className;

    // If there's another assignment with same student+class (different index), merge instead of duplicate
    const otherIndex = assignments.findIndex((a, idx) => idx !== assignEditIndex && a.student === student && a.className === className);

    if (otherIndex >= 0) {
      // merge subjects into the existing other assignment, remove the edited one
      assignments[otherIndex].subjects = Array.from(new Set([...(assignments[otherIndex].subjects || []), ...selected]));
      // remove the edited assignment (careful with array indices)
      assignments.splice(assignEditIndex, 1);
      // Update school.classes:
      // remove student entry from oldClass (if moved) and ensure student exists in new class group with merged subjects
      if (school.classes[oldClass]) {
        school.classes[oldClass] = school.classes[oldClass].filter((st) => st.name !== oldStudent);
        if (school.classes[oldClass].length === 0) delete school.classes[oldClass];
      }
      if (!school.classes[className]) school.classes[className] = [];
      // upsert into className list
      const clsArr = school.classes[className];
      const up = clsArr.find((st) => st.name === student);
      if (up) {
        up.subjects = Array.from(new Set([...(up.subjects || []), ...selected]));
      } else {
        clsArr.push({ name: student, subjects: selected });
      }
      showMessage(assignForm, "Assignment successfully updated", "success");
    } else {
      // simple update in-place
      assignments[assignEditIndex] = { student, className, subjects: selected };

      // Update school.classes:
      // remove student from oldClass entry (if different)
      if (oldClass !== className && school.classes[oldClass]) {
        school.classes[oldClass] = school.classes[oldClass].filter((st) => st.name !== oldStudent);
        if (school.classes[oldClass].length === 0) delete school.classes[oldClass];
      }
      // upsert into new class group
      if (!school.classes[className]) school.classes[className] = [];
      const clsArr = school.classes[className];
      const found = clsArr.find((st) => st.name === student);
      if (found) {
        found.subjects = Array.from(new Set([...(found.subjects || []), ...selected]));
      } else {
        clsArr.push({ name: student, subjects: selected });
      }
      showMessage(assignForm, "Assignment successfully updated", "success");
    }

    assignEditIndex = null;
    assignForm.querySelector("button[type=submit]").textContent = "Assign";
  }

  renderAssignments(searchBar.value, sortSelect.value);
  assignForm.reset();
});

// Start editing an assignment in-place (loads into assign form)
window.startEditAssignment = function (index) {
  const a = assignments[index];
  if (!a) return;
  // populate selects and checkboxes
  updateSelectOptions(); // ensure options exist
  document.getElementById("assignStudent").value = a.student;
  document.getElementById("assignClass").value = a.className;

  // clear and re-render subject checkbox checked states
  renderSubjectCheckboxes();
  const boxes = subjectCheckboxes.querySelectorAll("input[type=checkbox]");
  boxes.forEach((ch) => {
    ch.checked = a.subjects.includes(ch.value);
  });

  assignEditIndex = index;
  assignForm.querySelector("button[type=submit]").textContent = "Save Assignment";
  document.getElementById("assignStudent").focus();
};

// delete assignment
window.deleteAssignment = function (index) {
  if (!confirm("Delete this assignment?")) return;
  const a = assignments[index];
  if (a) {
    if (school.classes[a.className]) {
      school.classes[a.className] = school.classes[a.className].filter((s) => s.name !== a.student);
      if (school.classes[a.className].length === 0) delete school.classes[a.className];
    }
  }
  assignments.splice(index, 1);
  renderAssignments(searchBar.value, sortSelect.value);
};

// 
// JSON import/export
// 
exportJsonBtn.addEventListener("click", () => {
  const parts = [];
  parts.push("{");
  parts.push('  "classes": {');

  const classNames = Object.keys(school.classes);
  classNames.forEach((clsName, ci) => {
    const studentsInClass = school.classes[clsName] || [];
    parts.push(`    ${JSON.stringify(clsName)}: [`);
    const lines = studentsInClass.map((s) => {
      const subjInline = (s.subjects || []).map((sub) => JSON.stringify(sub)).join(", ");
      return `      { "name": ${JSON.stringify(s.name)}, "subjects": [${subjInline}] }`;
    });
    if (lines.length) parts.push(lines.join(",\n"));
    parts.push(`    ]${ci < classNames.length - 1 ? "," : ""}`);
  });

  parts.push("  }");
  parts.push("}");

  const jsonString = parts.join("\n");
  const blob = new Blob([jsonString], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "school_data.json";
  a.click();
  URL.revokeObjectURL(url);
});

// Import JSON
importJsonBtn.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (evt) => {
    try {
      const data = JSON.parse(evt.target.result);
      if (!data || !data.classes || typeof data.classes !== "object") {
        alert("Invalid JSON format — expected { classes: { ... } }");
        return;
      }

      // reset memory
      students = [];
      subjects = [];
      classes = [];
      assignments = [];
      school = { classes: {} };

      for (const [clsName, entries] of Object.entries(data.classes)) {
        if (!Array.isArray(entries)) continue;
        classes.push({ name: clsName });
        school.classes[clsName] = [];

        entries.forEach((entry) => {
          if (typeof entry === "string") {
            const parts = entry.split("—").length > 1 ? entry.split("—") : entry.split("-");
            const name = (parts[0] || "").trim();
            const subjList = (parts[1] || "").split(",").map((s) => s.trim()).filter(Boolean);
            if (!name) return;
            if (!students.find((st) => st.name === name)) students.push({ name, id: "", age: "" });
            subjList.forEach((sub) => {
              if (!subjects.find((x) => x.name === sub)) subjects.push({ name: sub, code: "" });
            });
            assignments.push({ student: name, className: clsName, subjects: subjList });
            school.classes[clsName].push({ name, subjects: subjList });
          } else if (typeof entry === "object" && entry !== null && entry.name) {
            const name = String(entry.name);
            const subjList = Array.isArray(entry.subjects) ? entry.subjects.map(String) : [];
            if (!students.find((st) => st.name === name)) students.push({ name, id: "", age: "" });
            subjList.forEach((sub) => {
              if (!subjects.find((x) => x.name === sub)) subjects.push({ name: sub, code: "" });
            });
            assignments.push({ student: name, className: clsName, subjects: subjList });
            school.classes[clsName].push({ name, subjects: subjList });
          }
        });
      }

      renderStudents();
      renderSubjects();
      renderClasses();
      renderAssignments(searchBar.value, sortSelect.value);
      updateSelectOptions();
      alert("Data imported successfully!");
    } catch (err) {
      alert("Error reading JSON file: " + err.message);
    } finally {
      importJsonBtn.value = "";
    }
  };
  reader.readAsText(file);
});

// -----------------------------
// Excel export helpers & handlers
// -----------------------------
function aoaToSheetWithAutoFit(rows, headingMerge, headingCellRef, headingStyle) {
  const ws = XLSX.utils.aoa_to_sheet(rows);
  if (headingMerge) {
    if (!ws["!merges"]) ws["!merges"] = [];
    ws["!merges"].push(headingMerge);
  }
  if (headingCellRef && headingStyle) {
    if (!ws[headingCellRef]) ws[headingCellRef] = { t: "s", v: rows[0][0] };
    ws[headingCellRef].s = headingStyle;
  }
  const colCount = rows.reduce((max, r) => Math.max(max, r.length), 0);
  const colWidths = new Array(colCount).fill(10);
  for (let c = 0; c < colCount; c++) {
    let max = 10;
    rows.forEach((r) => {
      const cell = r[c];
      if (cell == null) return;
      const len = String(cell).length;
      if (len > max) max = len;
    });
    colWidths[c] = { wch: Math.min(Math.max(max + 2, 10), 60) };
  }
  ws["!cols"] = colWidths;
  return ws;
}

function buildAndDownloadWorkbook(sheets, filename) {
  const wb = XLSX.utils.book_new();
  sheets.forEach((sh) => {
    const ws = aoaToSheetWithAutoFit(sh.rows, sh.headingMerge, sh.headingCellRef, sh.headingStyle);
    XLSX.utils.book_append_sheet(wb, ws, sh.name.substring(0, 31));
  });
  XLSX.writeFile(wb, filename);
}

if (exportExcelBtn) {
  exportExcelBtn.addEventListener("click", () => {
    const rows = [];
    rows.push(["All Assignments"]);
    rows.push([]);
    rows.push(["Student", "Class", "Subjects"]);
    assignments.forEach((a) => {
      rows.push([a.student, a.className, (a.subjects || []).join(", ")]);
    });
    const headingMerge = { s: { r: 0, c: 0 }, e: { r: 0, c: 2 } };
    const headingStyle = { font: { bold: true, sz: 12 }, alignment: { horizontal: "center", vertical: "center" } };
    buildAndDownloadWorkbook([{ name: "All Assignments", rows, headingMerge, headingCellRef: "A1", headingStyle }], "all_assignments.xlsx");
  });
}

if (exportByClassBtn) {
  exportByClassBtn.addEventListener("click", () => {
    const sheets = [];
    const classesWithAssignments = {};
    assignments.forEach((a) => {
      if (!classesWithAssignments[a.className]) classesWithAssignments[a.className] = [];
      classesWithAssignments[a.className].push(a);
    });

    Object.keys(classesWithAssignments).forEach((clsName) => {
      const assns = classesWithAssignments[clsName];
      const rows = [];
      rows.push([clsName]);
      rows.push([]);
      rows.push(["Student", "Subjects"]);
      assns.forEach((a) => {
        rows.push([a.student, (a.subjects || []).join(", ")]);
      });
      const headingMerge = { s: { r: 0, c: 0 }, e: { r: 0, c: 1 } };
      const headingStyle = { font: { bold: true, sz: 12 }, alignment: { horizontal: "center", vertical: "center" } };
      sheets.push({ name: clsName.substring(0, 31), rows, headingMerge, headingCellRef: "A1", headingStyle });
    });

    if (sheets.length === 0) {
      alert("No class assignments to export.");
      return;
    }
    buildAndDownloadWorkbook(sheets, "school_data_by_class.xlsx");
  });
}

// Toggle buttons
document.querySelectorAll(".toggle-btn").forEach((btn) => {
  const targetId = btn.getAttribute("data-target");
  const target = document.getElementById(targetId);
  if (!target) return;
  btn.addEventListener("click", () => target.classList.toggle("hidden"));
});


const ageInput = document.getElementById("studentAge");

ageInput.addEventListener("keydown", (e) => {
  const allowedKeys = [
    "Backspace",
    "Delete",
    "ArrowLeft",
    "ArrowRight",
    "Tab"
  ];

  // Allow control keys
  if (allowedKeys.includes(e.key)) return;

  // Allow digits only
  if (!/^\d$/.test(e.key)) {
    e.preventDefault();
  }
});

// Initialize
renderStudents();
renderSubjects();
renderClasses();
renderAssignments();






















