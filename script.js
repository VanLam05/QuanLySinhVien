// Chuẩn hóa họ tên: loại bỏ khoảng trắng thừa, viết hoa chữ cái đầu mỗi từ
const normalizeName = (name) => {
  return name
    .trim()
    .replace(/\s+/g, " ")  // Loại bỏ khoảng trắng thừa giữa các từ
    .split(" ")
    .map((word) => {
      if (word.length === 0) return "";
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
};

// Lớp đối tượng Sinh viên
class Student {
  constructor({ id, name, dob, className, gpa }) {
    this.id = id.trim();
    this.name = normalizeName(name);
    this.dob = dob;
    this.className = className.trim();
    this.gpa = Number(gpa);
  }

  // Phương thức cập nhật thông tin sinh viên
  update({ name, dob, className, gpa }) {
    if (name !== undefined) this.name = normalizeName(name);
    if (dob !== undefined) this.dob = dob;
    if (className !== undefined) this.className = className.trim();
    if (gpa !== undefined) this.gpa = Number(gpa);
  }
}

// Các phần tử DOM
const studentForm = document.getElementById("studentForm");
const submitBtn = document.getElementById("submitBtn");
const resetBtn = document.getElementById("resetBtn");
const seedBtn = document.getElementById("seedBtn");
const tableBody = document.getElementById("studentTable");
const totalCount = document.getElementById("totalCount");
const avgGpa = document.getElementById("avgGpa");
const maxGpa = document.getElementById("maxGpa");
const searchInput = document.getElementById("searchInput");
const notice = document.getElementById("formNotice");

// Danh sách sinh viên
let students = [];
let editingId = null;

// Trạng thái sắp xếp hiện tại
let currentSort = { field: null, order: null };

// Hiển thị thông báo
const showNotice = (message, type = "success") => {
  notice.textContent = message;
  notice.className = `notice show ${type}`;
  setTimeout(() => notice.classList.remove("show"), 3000);
};

// Lấy dữ liệu từ form
const getFormData = () => {
  const formData = new FormData(studentForm);
  return {
    id: formData.get("studentId"),
    name: formData.get("fullName"),
    dob: formData.get("dob"),
    className: formData.get("className"),
    gpa: formData.get("gpa"),
  };
};

// Reset form về trạng thái ban đầu
const resetForm = () => {
  studentForm.reset();
  editingId = null;
  submitBtn.textContent = "Thêm sinh viên";
};

// Kiểm tra dữ liệu nhập vào
const validateStudent = (data) => {
  // Kiểm tra đầy đủ thông tin
  if (
    !data.id ||
    !data.name ||
    !data.dob ||
    !data.className ||
    data.gpa === ""
  ) {
    showNotice("Vui lòng nhập đầy đủ thông tin.", "error");
    return false;
  }

  // Kiểm tra GPA trong khoảng 0.00 - 4.00
  const gpa = Number(data.gpa);
  if (Number.isNaN(gpa) || gpa < 0 || gpa > 4) {
    showNotice("Điểm GPA phải nằm trong khoảng 0.00 - 4.00.", "error");
    return false;
  }

  // Kiểm tra ngày sinh hợp lệ và không phải ngày trong tương lai
  const dob = new Date(data.dob);
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Reset về đầu ngày để so sánh chính xác

  if (Number.isNaN(dob.getTime())) {
    showNotice("Ngày sinh không hợp lệ.", "error");
    return false;
  }

  if (dob > today) {
    showNotice("Ngày sinh không được là ngày trong tương lai.", "error");
    return false;
  }

  // Kiểm tra tuổi hợp lý (tính theo năm)
  // Nếu tháng hiện tại < 9: tuổi phải >= 19
  // Nếu tháng hiện tại >= 9: tuổi phải >= 18
  const age = today.getFullYear() - dob.getFullYear();
  const currentMonth = today.getMonth() + 1; // getMonth() trả về 0-11
  const minAge = currentMonth < 9 ? 19 : 18;

  if (age < minAge) {
    showNotice(`Ngày sinh không hợp lệ (tuổi quá bé).`, "error");
    return false;
  }
  if (age > 100) {
    showNotice("Ngày sinh không hợp lệ (tuổi quá lớn).", "error");
    return false;
  }

  return true;
};

// Định dạng ngày tháng
const formatDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("vi-VN");
};

// Cập nhật trạng thái active của các nút sort
const updateSortButtons = () => {
  document.querySelectorAll(".sort-btn").forEach((btn) => {
    btn.classList.remove("active");
    if (
      btn.dataset.field === currentSort.field &&
      btn.dataset.order === currentSort.order
    ) {
      btn.classList.add("active");
    }
  });
};

// Tách tên tiếng Việt: Họ - Tên đệm - Tên
const parseVietnameseName = (fullName) => {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) {
    return { ho: "", tenDem: "", ten: parts[0] };
  }
  if (parts.length === 2) {
    return { ho: parts[0], tenDem: "", ten: parts[1] };
  }
  return {
    ho: parts[0],
    tenDem: parts.slice(1, -1).join(" "),
    ten: parts[parts.length - 1]
  };
};

// Hàm sắp xếp theo trường và thứ tự
const sortStudents = (list) => {
  if (!currentSort.field) return list;

  const { field, order } = currentSort;
  const modifier = order === "asc" ? 1 : -1;

  return list.slice().sort((a, b) => {
    let valA = a[field];
    let valB = b[field];

    // Xử lý theo loại dữ liệu
    if (field === "gpa") {
      return (valA - valB) * modifier;
    }
    if (field === "dob") {
      return (new Date(valA) - new Date(valB)) * modifier;
    }
    // Sắp xếp theo tên tiếng Việt: Tên -> Tên đệm -> Họ
    if (field === "name") {
      const nameA = parseVietnameseName(valA);
      const nameB = parseVietnameseName(valB);
      
      // So sánh Tên trước
      let cmp = nameA.ten.localeCompare(nameB.ten, "vi");
      if (cmp !== 0) return cmp * modifier;
      
      // Trùng tên thì so sánh Tên đệm
      cmp = nameA.tenDem.localeCompare(nameB.tenDem, "vi");
      if (cmp !== 0) return cmp * modifier;
      
      // Trùng tên đệm thì so sánh Họ
      return nameA.ho.localeCompare(nameB.ho, "vi") * modifier;
    }
    // Các trường text khác
    return valA.localeCompare(valB, "vi") * modifier;
  });
};

// Hiển thị bảng danh sách sinh viên
const renderTable = () => {
  const keyword = searchInput.value.trim().toLowerCase();
  let filtered = students.filter((student) => {
    return (
      student.id.toLowerCase().includes(keyword) ||
      student.name.toLowerCase().includes(keyword)
    );
  });

  // Áp dụng sắp xếp
  filtered = sortStudents(filtered);

  // Cập nhật trạng thái nút sort
  updateSortButtons();

  if (filtered.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="6" class="empty">Không tìm thấy sinh viên phù hợp.</td>
      </tr>
    `;
    return;
  }

  tableBody.innerHTML = filtered
    .map((student) => {
      return `
        <tr>
          <td>${student.id}</td>
          <td>${student.name}</td>
          <td>${formatDate(student.dob)}</td>
          <td>${student.className}</td>
          <td><span class="badge">${student.gpa.toFixed(2)}</span></td>
          <td>
            <button class="btn-secondary" data-action="edit" data-id="${student.id}">Sửa</button>
            <button class="btn-danger" data-action="delete" data-id="${student.id}">Xóa</button>
          </td>
        </tr>
      `;
    })
    .join("");
};

// Cập nhật thống kê
const updateSummary = () => {
  totalCount.textContent = students.length;
  if (students.length === 0) {
    avgGpa.textContent = "0.00";
    maxGpa.textContent = "0.00";
    return;
  }
  const total = students.reduce((sum, s) => sum + s.gpa, 0);
  const max = Math.max(...students.map((s) => s.gpa));
  avgGpa.textContent = (total / students.length).toFixed(2);
  maxGpa.textContent = max.toFixed(2);
};

// Thêm sinh viên mới
const addStudent = (data) => {
  const existing = students.find(
    (s) => s.id.toLowerCase() === data.id.toLowerCase()
  );
  if (existing) {
    showNotice("Mã sinh viên đã tồn tại. Vui lòng kiểm tra lại.", "error");
    return;
  }
  students.push(new Student(data));
  showNotice("Đã thêm sinh viên thành công!");
  resetForm();
  render();
};

// Cập nhật thông tin sinh viên
const updateStudent = (data) => {
  const student = students.find((s) => s.id === editingId);
  if (!student) {
    showNotice("Không tìm thấy sinh viên để cập nhật.", "error");
    return;
  }
  student.update(data);
  showNotice("Cập nhật thông tin thành công!");
  resetForm();
  render();
};

// Render toàn bộ giao diện
const render = () => {
  renderTable();
  updateSummary();
};

// Xử lý sự kiện submit form
studentForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = getFormData();
  if (!validateStudent(data)) return;
  if (editingId) {
    updateStudent(data);
  } else {
    addStudent(data);
  }
});

// Xử lý nút làm mới
resetBtn.addEventListener("click", () => resetForm());

// Xử lý nút dữ liệu mẫu
seedBtn.addEventListener("click", () => {
  students = [
    new Student({
      id: "B23DCCN001",
      name: "Bùi Anh Đức",
      dob: "2005-03-15",
      className: "D23CTCN01-B",
      gpa: 3.82,
    }),
    new Student({
      id: "B23DCCN002",
      name: "Bùi Văn Lâm",
      dob: "2005-12-20",
      className: "D23CTCN01-B",
      gpa: 3.61,
    }),
    new Student({
      id: "B23DCCN003",
      name: "Phan Văn Khôi",
      dob: "2005-11-02",
      className: "D23CTCN01-B",
      gpa: 3.84,
    }),
    new Student({
      id: "B23DCCN004",
      name: "Dương Trọng Thắng",
      dob: "2005-09-02",
      className: "D23CTCN01-B",
      gpa: 3.78,
    }),
    new Student({
      id: "B23DCCN005",
      name: "Trần Văn Khánh",
      dob: "2005-08-02",
      className: "D23CTCN01-B",
      gpa: 3.91,
    }),
  ];
  render();
  showNotice("Đã thêm dữ liệu mẫu!");
});

// Xử lý tìm kiếm
searchInput.addEventListener("input", renderTable);

// Xử lý sắp xếp khi click vào nút sort
document.querySelector("thead").addEventListener("click", (event) => {
  const btn = event.target.closest(".sort-btn");
  if (!btn) return;

  const field = btn.dataset.field;
  const order = btn.dataset.order;

  // Toggle: nếu đang active thì bỏ sort, ngược lại thì set sort mới
  if (currentSort.field === field && currentSort.order === order) {
    currentSort = { field: null, order: null };
  } else {
    currentSort = { field, order };
  }

  renderTable();
});

// Xử lý sự kiện trong bảng (sửa, xóa)
tableBody.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  const action = button.dataset.action;
  const id = button.dataset.id;

  if (action === "edit") {
    const student = students.find((s) => s.id === id);
    if (!student) return;
    document.getElementById("studentId").value = student.id;
    document.getElementById("fullName").value = student.name;
    document.getElementById("dob").value = student.dob;
    document.getElementById("className").value = student.className;
    document.getElementById("gpa").value = student.gpa;
    editingId = student.id;
    submitBtn.textContent = "Cập nhật";
  }

  if (action === "delete") {
    const confirmDelete = window.confirm(
      "Bạn có chắc chắn muốn xóa sinh viên này?"
    );
    if (!confirmDelete) return;
    students = students.filter((s) => s.id !== id);
    render();
    showNotice("Đã xóa sinh viên.");
  }
});

// Xử lý tải danh sách sinh viên
const downloadBtn = document.getElementById("downloadBtn");
downloadBtn.addEventListener("click", () => {
  if (students.length === 0) {
    showNotice("Đanh sách sinh viên trống. Không có dữ liệu để tải.", "error");
    return;
  }

  // Tạo dữ liệu cho Excel
  const excelData = students.map((s) => ({
    "Mã SV": s.id,
    "Họ và tên": s.name,
    "Ngày sinh": formatDate(s.dob),
    "Lớp học": s.className,
    "Điểm GPA": s.gpa.toFixed(2)
  }));

  // Tạo workbook và worksheet
  const worksheet = XLSX.utils.json_to_sheet(excelData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Danh sách sinh viên");

  // Đặt độ rộng cột
  worksheet["!cols"] = [
    { wch: 12 },  // Mã SV
    { wch: 25 },  // Họ và tên
    { wch: 15 },  // Ngày sinh
    { wch: 15 },  // Lớp học
    { wch: 12 }   // Điểm GPA
  ];

  // Xuất file Excel
  const fileName = "danh_sach_sinh_vien_" + new Date().toISOString().slice(0, 10) + ".xlsx";
  XLSX.writeFile(workbook, fileName);

  showNotice("Đã tải danh sách sinh viên thành công!");
});

// Khởi tạo giao diện
render();
