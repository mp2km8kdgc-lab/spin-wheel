const canvas = document.getElementById("wheelCanvas");
const ctx = canvas.getContext("2d");

// 固定内部像素尺寸为 650x650（不要动态修改）
const FIXED_SIZE = 650;
const ratio = window.devicePixelRatio || 1;
canvas.width = FIXED_SIZE * ratio;
canvas.height = FIXED_SIZE * ratio;
canvas.style.width = `${FIXED_SIZE}px`;
canvas.style.height = `${FIXED_SIZE}px`;

ctx.scale(ratio, ratio);
ctx.imageSmoothingEnabled = true;

let items = ["A", "B", "C", "D", "E"];
let angle = 0;
let spinning = false;

const tickSound = document.getElementById("tickSound");

if (!tickSound) {
    console.warn("未找到 tickSound 元素，请添加 <audio id='tickSound' src='tick.mp3'></audio>");
}

// ========== Socket.IO 初始化 ==========
let socket;
if (typeof io !== "undefined") {
    socket = io("https://spin-wheel-lk2g.onrender.com");
} else {
    console.error("Socket.IO client not loaded. Please include <script src='/socket.io/socket.io.js'></script>");
}

// ========== 获取客户端 ID 和轮盘 ID ==========
function getClientId() {
    let id = localStorage.getItem("client_id");
    if (!id) {
        id = crypto.randomUUID();
        localStorage.setItem("client_id", id);
    }
    return id;
}

function getWheelId() {
    let url = new URL(window.location);
    let id = url.searchParams.get("wheel_id");
    if (!id) {
        id = crypto.randomUUID();
        url.searchParams.set("wheel_id", id);
        history.replaceState({}, '', url);
    }
    return id;
}

const client_id = getClientId();
const wheel_id = getWheelId();

// ========== 本地存储 ==========
function saveWheel() {
    localStorage.setItem("wheel_" + wheel_id, JSON.stringify(items));
}

function loadWheel() {
    let data = localStorage.getItem("wheel_" + wheel_id);
    if (data) {
        items = JSON.parse(data);
    }
}
loadWheel();

// ========== 角色控制 ==========
const role = new URLSearchParams(location.search).get("role");
if (role === "v") {
    const batchInput = document.getElementById("batchInput");
    if (batchInput) batchInput.disabled = true;
}

// ========== Socket 事件监听 ==========
if (socket) {
    socket.emit("join", wheel_id);
    socket.emit("update", { wheel_id, items });

    socket.on("wheel_update", (data) => {
        items = data;
        renderList();
    });

    socket.on("spin_result", (data) => {
        showResult(data.result);
    });
}

// ========== 绘制转盘 ==========
function drawWheel() {
    // 注意：ctx 的坐标系仍然是 650x650
    ctx.clearRect(0, 0, FIXED_SIZE, FIXED_SIZE);

    let radius = 300;
    let center = 325;
    let arc = Math.PI * 2 / items.length;

    items.forEach((text, i) => {
        let start = angle + i * arc - Math.PI / 2;
        let end = start + arc;

        ctx.beginPath();
        ctx.moveTo(center, center);
        ctx.arc(center, center, radius, start, end);
        ctx.fillStyle = `hsl(${i * 360 / items.length}, 70%, 55%)`;
        ctx.fill();

        ctx.save();
        ctx.translate(center, center);
        ctx.rotate(start + arc / 2);
        ctx.textAlign = "right";
        ctx.fillStyle = "white";

        let fontSize = Math.min(32, 300 / items.length + 16);
        ctx.font = `bold ${fontSize}px Arial`;

        let display = text;
        if (items.length > 40) {
            display = text.slice(0, 4);
        }

        ctx.fillText(display, radius - 20, 10);
        ctx.restore();
    });

    requestAnimationFrame(drawWheel);
}
drawWheel();

// ========== 旋转逻辑 ==========
function spin() {
    if (spinning) return;
    spinning = true;

    let velocity = Math.random() * 0.35 + 0.35;
    let decel = 0.992;
    let lastSector = -1;

    function animate() {
        angle += velocity;
        angle = angle % (Math.PI * 2);
        velocity *= decel;

        let sector = Math.floor(angle / (Math.PI * 2 / items.length));
        if (sector !== lastSector) {
            if (tickSound) {
                tickSound.currentTime = 0;
                tickSound.play().catch(() => {});
            }
            lastSector = sector;
        }

        if (velocity < 0.002) {
            spinning = false;

            let arc = Math.PI * 2 / items.length;
            let rawAngle = (-Math.PI / 2 - angle) % (2 * Math.PI);
            if (rawAngle < 0) rawAngle += 2 * Math.PI;
            let index = Math.floor((rawAngle + Math.PI / 2) / arc) % items.length;
            let result = items[index];

            showResult(result);

            if (socket) {
                socket.emit("spin", { wheel_id, result });
            }
            return;
        }

        requestAnimationFrame(animate);
    }

    animate();
}

// ========== 结果显示 ==========
function showResult(text) {
    let modal = document.getElementById("resultModal");
    document.getElementById("resultText").innerText = text;
    modal.style.display = "flex";
}

document.getElementById("spinAgain").onclick = () => {
    document.getElementById("resultModal").style.display = "none";
};

canvas.addEventListener("click", spin);

document.addEventListener("keydown", (e) => {
    if (e.code === "Space") {
        e.preventDefault();
        spin();
    }
});

// ========== 批量添加项目 ==========
document.getElementById("applyBatch").onclick = () => {
    let lines = document.getElementById("batchInput").value.split("\n");
    items = lines.filter(v => v.trim() != "");
    saveWheel();
    renderList();
    if (socket) {
        socket.emit("update", { wheel_id, items });
    }
};

// ========== 渲染可编辑列表 ==========
function renderList() {
    let ul = document.getElementById("itemList");
    ul.innerHTML = "";
    items.forEach((item, i) => {
        let li = document.createElement("li");
        li.contentEditable = true;
        li.innerText = item;
        li.oninput = () => {
            items[i] = li.innerText;
            saveWheel();
            if (socket) {
                socket.emit("update", { wheel_id, items });
            }
        };
        ul.appendChild(li);
    });
}
renderList();
