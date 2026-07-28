import { Nectar3D } from './three-scene.js';

// Initialize 3D Scene
const threeContainer = document.getElementById('three-container');
const nectar3D = new Nectar3D(threeContainer);

// Game Configuration
let gameConfig = {
    playerCount: 3,
    isMultiplayer: false,
    playerNames: ['The First Architect', 'The Golden Collector', 'The Midnight Sage'],
    autoStart: true
};

const playerColors = ['#e74c3c', '#3498db', '#f1c40f', '#9b59b6', '#e67e22', '#1abc9c'];
const players = [];
const bees = [];
const nectarTokens = [];
let currentPlayerIndex = 0;
let playerHasMovedThisTurn = false;
let selectedBee = null;

// Hex directions
const directions = [
    { q: 1, r: 0 }, { q: 1, r: -1 }, { q: 0, r: -1 },
    { q: -1, r: 0 }, { q: -1, r: 1 }, { q: 0, r: 1 }
];

class Player {
    constructor(id, color, homeCorners) {
        this.id = id;
        this.color = color;
        this.score = 0;
        this.bees = [];
        this.homeCorners = homeCorners;
    }
}

class Bee {
    constructor(id, ownerId, q, r) {
        this.id = id;
        this.ownerId = ownerId;
        this.q = q;
        this.r = r;
        this.tokens = [];
        this.mesh = null;
        this.movedThisTurn = false;
        this.remainingMoves = 1;
        this.tokenMeshes = [];
    }

    render() {
        if (!this.mesh) {
            this.mesh = nectar3D.createBee3D(this.ownerId, playerColors[this.ownerId]);
        }

        const hexRadius = 1.6;
        const targetX = hexRadius * Math.sqrt(3) * (this.q + this.r / 2);
        const targetZ = hexRadius * 1.5 * this.r;

        gsap.to(this.mesh.position, {
            x: targetX,
            z: targetZ,
            y: 0,
            duration: 0.6,
            ease: "power2.inOut"
        });

        // Opacity handled via material update if needed
        if (this.movedThisTurn && this.remainingMoves <= 0) {
            this.mesh.traverse(c => { if(c.isMesh) c.material.opacity = 0.3; });
        } else {
            this.mesh.traverse(c => { if(c.isMesh) c.material.opacity = 1.0; });
        }
        
        this.renderTokens();
    }

    renderTokens() {
        if (this.tokenMeshes) this.tokenMeshes.forEach(m => nectar3D.scene.remove(m));
        this.tokenMeshes = [];

        this.tokens.forEach((val, idx) => {
            const mesh = nectar3D.createNectar3D(val);
            const scale = 0.4;
            mesh.scale.set(scale, scale, scale);
            mesh.position.set(0, 0.4 + idx * 0.4, 0);
            this.mesh.add(mesh);
            this.tokenMeshes.push(mesh);
        });
    }
}

function initBoard() {
    if(window.hexMap) {
        window.hexMap.forEach(hex => nectar3D.boardSurface.remove(hex));
        window.hexMap.clear();
    } else {
        window.hexMap = new Map();
    }
    
    nectarTokens.length = 0;

    // Rings
    for (let r = 0; r <= 3; r++) createRing(r);
    addHoneycombs();
    
    initGame();
}

function createHex(q, r, type = 'default') {
    const hex3D = nectar3D.createHex3D(q, r, type);
    window.hexMap.set(`${q},${r}`, hex3D);
}

function createRing(radius) {
    if (radius === 0) { createHex(0, 0, 'pink'); return; }
    let currentQ = -radius;
    let currentR = radius;

    for (let i = 0; i < 6; i++) {
        const dir = directions[i];
        for (let j = 0; j < radius; j++) {
            let type = 'default';
            if (currentQ === -2 && currentR === 2) type = 'black';
            else if (currentQ === 2 && currentR === 0) type = 'black';
            else if (currentQ === 0 && currentR === -2) type = 'black';
            else if (currentQ === -2 && currentR === 0) type = 'gold';
            else if (currentQ === 0 && currentR === 2) type = 'gold';
            else if (currentQ === 2 && currentR === -2) type = 'gold';

            createHex(currentQ, currentR, type);
            currentQ += dir.q;
            currentR += dir.r;
        }
    }
}

function addHoneycombs() {
    const corners = [{q:0,r:-3}, {q:3,r:-3}, {q:3,r:0}, {q:0,r:3}, {q:-3,r:3}, {q:-3,r:0}];
    corners.forEach(corner => {
        directions.forEach(dir => {
            const nQ = corner.q + dir.q;
            const nR = corner.r + dir.r;
            const dist = (Math.abs(nQ) + Math.abs(nR) + Math.abs(nQ + nR)) / 2;
            if (dist > 3) createHex(nQ, nR, 'honeycomb');
        });
    });
}

function initGame() {
    players.length = 0;
    bees.length = 0;
    
    const startPositions = [{q:3,r:0}, {q:-3,r:3}, {q:0,r:-3}]; // Symmetric for 3 players
    
    startPositions.forEach((pos, index) => {
        let homeHexes = [];
        directions.forEach(dir => {
            const nQ = pos.q + dir.q, nR = pos.r + dir.r;
            const dist = (Math.abs(nQ) + Math.abs(nR) + Math.abs(nQ + nR)) / 2;
            if (dist > 3) homeHexes.push({q: nQ, r: nR});
        });

        const player = new Player(index, playerColors[index], homeHexes);
        players.push(player);

        homeHexes.forEach(h => {
            const hex3D = window.hexMap.get(`${h.q},${h.r}`);
            if (hex3D) {
                hex3D.children[0].material.color.set(player.color);
                hex3D.userData.owner = index;
            }
            const bee = new Bee(`${index}-${bees.length}`, index, h.q, h.r);
            player.bees.push(bee);
            bees.push(bee);
            bee.render();
        });
    });

    nectar3D.onClickCallback = (e) => {
        if (e.type === 'bee') {
            const bee = bees.find(b => b.mesh === e.mesh);
            if (bee) handleBeeClick(bee);
        } else if (e.type === 'hex') {
            handleHexClick(e.q, e.r);
        }
    };

    triggerWeather();
    updateHUD();
}

function updateHUD() {
    // Current Turn
    const display = document.getElementById('current-player-display');
    const p = players[currentPlayerIndex];
    display.innerText = gameConfig.playerNames[currentPlayerIndex].toUpperCase();
    display.style.borderColor = p.color;
    display.style.color = p.color;

    // Scores
    const container = document.getElementById('status-bar-container');
    container.innerHTML = '';
    players.forEach(player => {
        const div = document.createElement('div');
        div.className = 'player-stat';
        div.innerHTML = `
            <div class="player-name">${gameConfig.playerNames[player.id]}</div>
            <div class="player-score-track">
                <div class="player-score-fill" style="width: ${(player.score / 10) * 100}%; background: ${player.color}; box-shadow: 0 0 10px ${player.color}"></div>
            </div>
        `;
        container.appendChild(div);
    });

    // Next Turn Button
    const btn = document.getElementById('next-turn-btn');
    if (playerHasMovedThisTurn) {
        btn.disabled = false;
        btn.classList.remove('disabled');
    } else {
        btn.disabled = true;
        btn.classList.add('disabled');
    }
}

function handleBeeClick(bee) {
    if (bee.ownerId !== currentPlayerIndex) return;
    if (selectedBee && selectedBee.mesh) deselectBee(selectedBee);
    selectedBee = bee;
    selectBee(bee);
}

function selectBee(bee) {
    bee.mesh.traverse(c => { if(c.isMesh) c.material.emissive.set(0x333333); });
    updateBeePanel();
}

function deselectBee(bee) {
    bee.mesh.traverse(c => { if(c.isMesh) c.material.emissive.set(0x000000); });
}

function handleHexClick(q, r) {
    if (!selectedBee) return;
    moveBee(selectedBee, q, r);
}

function moveBee(bee, tQ, tR) {
    if (bee.remainingMoves <= 0) return;
    const dist = (Math.abs(bee.q - tQ) + Math.abs(bee.r - tR) + Math.abs((bee.q + bee.r) - (tQ + tR))) / 2;
    if (dist !== 1) return;

    const occupied = bees.find(b => b.q === tQ && b.r === tR);
    if (occupied) return;

    const targetHex3D = window.hexMap.get(`${tQ},${tR}`);
    if (targetHex3D && targetHex3D.userData.type === 'honeycomb') {
        const isMyHome = players[bee.ownerId].homeCorners.some(h => h.q === tQ && h.r === tR);
        if (!isMyHome) return;
    }

    bee.q = tQ; bee.r = tR;
    bee.movedThisTurn = true;
    bee.remainingMoves--;
    playerHasMovedThisTurn = true;
    
    // Check Nectar
    const nIndex = nectarTokens.findIndex(n => n.q === tQ && n.r === tR);
    if (nIndex !== -1) {
        const n = nectarTokens[nIndex];
        bee.tokens.push(n.value);
        if (n.mesh) nectar3D.scene.remove(n.mesh);
        nectarTokens.splice(nIndex, 1);
    }

    // Check Score
    const isHome = players[bee.ownerId].homeCorners.some(h => h.q === tQ && h.r === tR);
    if (isHome && bee.tokens.length > 0) {
        players[bee.ownerId].score += bee.tokens.reduce((a,b) => a+b, 0);
        bee.tokens = [];
        if (players[bee.ownerId].score >= 10) showWin(players[bee.ownerId]);
    }

    bee.render();
    updateHUD();
    updateBeePanel();
}

function triggerWeather() {
    const roll = Math.floor(Math.random() * 6) + 1;
    const display = document.getElementById('weather-display');
    let text = "ENVIRONMENT STABLE";
    
    if (roll === 1) { spawnNectar(1, 'black'); text = "1 TOKEN ACCUMULATED"; }
    else if (roll === 2) { spawnNectar(2, 'gold'); text = "2 TOKENS ACCUMULATED"; }
    else if (roll === 4) { spawnNectar(4, 'pink'); text = "4 TOKENS ACCUMULATED"; }
    
    display.innerText = text;
}

function spawnNectar(val, type) {
    if (!window.hexMap) return;
    window.hexMap.forEach(hex => {
        if (hex.userData.type !== type) return;
        if (bees.find(b => b.q === hex.userData.q && b.r === hex.userData.r)) return;
        if (nectarTokens.find(n => n.q === hex.userData.q && n.r === hex.userData.r)) return;
        
        const mesh = nectar3D.createNectar3D(val);
        const hexRadius = 1.6;
        mesh.position.set(hexRadius * Math.sqrt(3) * (hex.userData.q + hex.userData.r/2), 0.5, hexRadius * 1.5 * hex.userData.r);
        gsap.to(mesh.position, { y: 0.8, duration: 1.5, repeat:-1, yoyo:true, ease:"sine.inOut" });
        nectarTokens.push({ q: hex.userData.q, r: hex.userData.r, value: val, mesh: mesh });
    });
}

function updateBeePanel() {
    const panel = document.getElementById('bee-panel');
    if (!selectedBee) { panel.style.display = 'none'; return; }
    panel.style.display = 'block';
    panel.innerHTML = `<h3>UNIT SELECT: ${selectedBee.id}</h3>`;
    
    if(selectedBee.tokens.length > 0) {
        const val = selectedBee.tokens.reduce((a,b)=>a+b, 0);
        panel.innerHTML += `<div class="token-item">NECTAR STORE: ${val}</div>`;
        panel.innerHTML += `<div class="action-buttons"><button class="luxury-btn" onclick="useBoost()">Use Boost</button></div>`;
    } else {
        panel.innerHTML += `<div class="token-item">NO NECTAR DETECTED</div>`;
    }
}

window.useBoost = () => {
    if(!selectedBee || selectedBee.tokens.length === 0) return;
    const val = selectedBee.tokens.pop();
    selectedBee.remainingMoves += val;
    selectedBee.render();
    updateBeePanel();
};

window.nextTurn = () => {
    currentPlayerIndex = (currentPlayerIndex + 1) % players.length;
    playerHasMovedThisTurn = false;
    bees.forEach(b => { b.movedThisTurn = false; b.remainingMoves = 1; b.render(); });
    if (selectedBee) deselectBee(selectedBee);
    selectedBee = null;
    triggerWeather();
    updateHUD();
};

function showWin(p) {
    document.getElementById('win-modal').style.display = 'flex';
    document.getElementById('winner-text').innerText = `${gameConfig.playerNames[p.id]} Wins`;
    document.getElementById('winner-text').style.color = p.color;
}

window.toggleOptions = () => {
    const m = document.getElementById('options-modal');
    m.style.display = m.style.display === 'none' ? 'flex' : 'none';
};

document.getElementById('next-turn-btn').onclick = window.nextTurn;

window.addEventListener('load', () => {
    initBoard();
});
