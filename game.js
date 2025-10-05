// Game Canvas Setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Load tank images
const tankImage = new Image();
tankImage.src = 'assets/tank-logo.png'; // Player tank image

// Load wall image (texture)
const wallImage = new Image();
let wallTextureReady = false;
wallImage.onload = () => { wallTextureReady = wallImage.naturalWidth > 0; };
wallImage.onerror = () => { wallTextureReady = false; };
wallImage.src = 'assets/wall.png'; // Save the provided image as assets/wall.png

// Load enemy tank images
const enemyTankImages = [
    new Image(), // tank-logo-1.png
    new Image(), // tank-logo-2.png
    new Image(), // tank-logo-3.png
    new Image(), // tank-logo-4.png
    new Image()  // tank-logo-5.png
];

// Set source for each enemy tank image
enemyTankImages[0].src = 'assets/tank-logo-1.png';
enemyTankImages[1].src = 'assets/tank-logo-2.png';
enemyTankImages[2].src = 'assets/tank-logo-3.png';
enemyTankImages[3].src = 'assets/tank-logo-4.png';
enemyTankImages[4].src = 'assets/tank-logo-5.png';

// Load boss tank images
const bossTankImages = [
    new Image(), // boss-tank.png
    new Image(), // boss-tank-1.png
    new Image(), // boss-tank-2.png
    new Image()  // boss-tank-3.png
];

// Set source for each boss tank image
bossTankImages[0].src = 'assets/boss-tank.png';
bossTankImages[1].src = 'assets/boss-tank-1.png';
bossTankImages[2].src = 'assets/boss-tank-2.png';
bossTankImages[3].src = 'assets/boss-tank-3.png';

// Game Settings
const GAME_WIDTH = 800;
const GAME_HEIGHT = 600;
const TANK_SIZE = 40;
const BULLET_SPEED = 8;
const WALL_SIZE = 40;
const SIZE_DELTA = 15; // tambahan ukuran untuk semua tank
const MAX_ALLIES = 2; // batas maksimal bala bantuan NPC

// Game State
let gameRunning = false;
let gamePaused = false;
let score = 0;
let lastWallRespawnTime = 0;
const WALL_RESPAWN_TIME = 10000; // 10 detik
let gameOver = false;
let animationId = null;
let gameLevel = 1;
let enemyKillCount = 0;
let bossSpawned = false;
let maxEnemies = 5; // Jumlah maksimum musuh yang bisa muncul sekaligus
const keys = {};

// Inisialisasi array game objects
let bullets = [];
let enemies = [];
let walls = [];
let powerUps = [];
let particles = [];
let floatingTexts = [];
let destructibleWallPositions = [];
let allies = [];

// Player Tank
const player = {
    x: GAME_WIDTH / 2,
    y: GAME_HEIGHT - 100,
    width: TANK_SIZE + SIZE_DELTA,
    height: TANK_SIZE + SIZE_DELTA,
    speed: 3,
    angle: 0,
    health: 100,
    lastShot: 0,
    shootDelay: 500, // ms between shots
    color: '#3498db',
    
    update: function() {
        // Movement
        if (keys['ArrowLeft']) {
            this.angle = Math.PI;
            this.x = Math.max(this.width/2, this.x - this.speed);
        }

        if (keys['ArrowRight']) {
            this.angle = 0;
            this.x = Math.min(GAME_WIDTH - this.width/2, this.x + this.speed);
        }
        if (keys['ArrowUp']) {
            this.angle = -Math.PI/2;
            this.y = Math.max(this.height/2, this.y - this.speed);
        }
        if (keys['ArrowDown']) {
            this.angle = Math.PI/2;
            this.y = Math.min(GAME_HEIGHT - this.height/2, this.y + this.speed);
        }
        
        // Shooting
        if (keys[' '] && Date.now() - this.lastShot > this.shootDelay) {
            this.shoot();
            this.lastShot = Date.now();
        }
    },
    
    draw: function() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        
        // Draw tank image if loaded, otherwise draw rectangle as fallback
        if (tankImage.complete) {
            // Save the current context state
            ctx.save();
            // Move to the center of the tank
            ctx.translate(0, 0);
            // Rotate the tank (90 degrees to make it point up by default)
            ctx.rotate(Math.PI/2);
            // Draw the image centered
            ctx.drawImage(tankImage, -this.width/2, -this.height/2, this.width, this.height);
            // Restore to the previous state
            ctx.restore();
        } else {
            // Fallback rectangle if image not loaded
            ctx.fillStyle = this.color;
            ctx.fillRect(-this.width/2, -this.height/2, this.width, this.height);
            
            // Tank gun (fallback)
            ctx.fillStyle = '#2c3e50';
            ctx.fillRect(0, -3, this.width/2 + 10, 6);
        }
        
        // Health bar
        const healthBarWidth = this.width * 0.8;
        const healthBarHeight = 5;
        const healthBarX = -healthBarWidth / 2;
        const healthBarY = -this.height/2 - 10;
        
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(healthBarX, healthBarY, healthBarWidth, healthBarHeight);
        
        ctx.fillStyle = '#00ff00';
        const healthPercentage = this.health / 100;
        ctx.fillRect(healthBarX, healthBarY, healthBarWidth * healthPercentage, healthBarHeight);
        
        ctx.restore();
    },
    
    shoot: function() {
        const bullet = {
            x: this.x + Math.cos(this.angle) * (this.width/2 + 10),
            y: this.y + Math.sin(this.angle) * (this.width/2 + 10),
            radius: 4,
            speed: BULLET_SPEED,
            angle: this.angle,
            color: '#ffff00',
            isPlayerBullet: true,
            
            update: function() {
                this.x += Math.cos(this.angle) * this.speed;
                this.y += Math.sin(this.angle) * this.speed;
            },
            
            draw: function() {
                ctx.save();
                ctx.fillStyle = this.color;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        };
        
        bullets.push(bullet);
    }
};

// Wall class
class Wall {
    constructor(x, y, width, height, indestructible = false) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.indestructible = indestructible;
        this.health = indestructible ? Infinity : 3;
    }
    
    draw() {
        ctx.save();
        // Draw textured wall if image loaded correctly, else fallback color
        if (wallTextureReady) {
            ctx.drawImage(
                wallImage,
                this.x - this.width/2,
                this.y - this.height/2,
                this.width,
                this.height
            );
        } else {
            ctx.fillStyle = this.indestructible ? '#7f8c8d' : '#8B4513';
            ctx.fillRect(this.x - this.width/2, this.y - this.height/2, this.width, this.height);
        }
        
        // Draw health for destructible walls
        if (!this.indestructible) {
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 1;
            ctx.strokeRect(this.x - this.width/2, this.y - this.height/2 - 10, this.width, 5);
            
            const healthPercentage = this.health / 3;
            ctx.fillStyle = healthPercentage > 0.6 ? '#2ecc71' : healthPercentage > 0.3 ? '#f39c12' : '#e74c3c';
            ctx.fillRect(this.x - this.width/2, this.y - this.height/2 - 10, this.width * healthPercentage, 5);
        }
        
        ctx.restore();
    }
}

// Spawn an ally (NPC) that helps the player
function spawnAlly() {
    if (allies.length >= MAX_ALLIES) return;
    // Spawn dekat pemain dengan sedikit offset
    const spawnOffset = 50;
    const ax = Math.max(
        TANK_SIZE,
        Math.min(GAME_WIDTH - TANK_SIZE, player.x + (Math.random() * spawnOffset * 2 - spawnOffset))
    );
    const ay = Math.max(
        TANK_SIZE,
        Math.min(GAME_HEIGHT - TANK_SIZE, player.y + (Math.random() * spawnOffset * 2 - spawnOffset))
    );

    const ally = {
        x: ax,
        y: ay,
        width: TANK_SIZE + SIZE_DELTA,
        height: TANK_SIZE + SIZE_DELTA,
        speed: 2,
        angle: 0,
        health: 80,
        lastShot: 0,
        shootDelay: 800,
        color: '#27ae60',
        lastTargetUpdate: 0,
        targetX: player.x,
        targetY: player.y,

        update: function() {
            // Cari target musuh terdekat
            let nearest = null;
            let nearestDist = Infinity;
            for (const e of enemies) {
                const dx = e.x - this.x;
                const dy = e.y - this.y;
                const d = Math.hypot(dx, dy);
                if (d < nearestDist) { nearestDist = d; nearest = e; }
            }

            // Jika ada musuh, kejar dan hadap musuh; kalau tidak, dekat dengan pemain
            let tx, ty;
            if (nearest) {
                tx = nearest.x; ty = nearest.y;
            } else {
                tx = player.x; ty = player.y;
            }

            const dx = tx - this.x;
            const dy = ty - this.y;
            const dist = Math.hypot(dx, dy);
            if (dist > 1) {
                this.angle = Math.atan2(dy, dx);
                // Jaga jarak kecil dari pemain agar tidak menumpuk
                const desiredDist = nearest ? 0 : 60;
                if (dist > desiredDist) {
                    this.x += Math.cos(this.angle) * this.speed;
                    this.y += Math.sin(this.angle) * this.speed;
                }
            }

            // Tembak ke musuh saat ada target
            if (nearest && Date.now() - this.lastShot > this.shootDelay) {
                this.shootAt(nearest);
                this.lastShot = Date.now();
            }

            // Batas area
            this.x = Math.max(this.width/2, Math.min(GAME_WIDTH - this.width/2, this.x));
            this.y = Math.max(this.height/2, Math.min(GAME_HEIGHT - this.height/2, this.y));
        },

        draw: function() {
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(this.angle);
            // Gunakan gambar player jika ada, atau kotak hijau
            if (tankImage && tankImage.complete) {
                ctx.save();
                ctx.rotate(Math.PI/2);
                ctx.drawImage(tankImage, -this.width/2, -this.height/2, this.width, this.height);
                ctx.restore();
            } else {
                ctx.fillStyle = this.color;
                ctx.fillRect(-this.width/2, -this.height/2, this.width, this.height);
                ctx.fillStyle = '#1e8449';
                ctx.fillRect(0, -3, this.width/2 + 10, 6);
            }
            // Health bar
            const w = this.width * 0.8;
            const hbX = -w/2;
            const hbY = -this.height/2 - 10;
            ctx.fillStyle = '#aa0000';
            ctx.fillRect(hbX, hbY, w, 5);
            ctx.fillStyle = '#00ff88';
            const pct = Math.max(0, this.health / 80);
            ctx.fillRect(hbX, hbY, w * pct, 5);
            ctx.restore();
        },

        shootAt: function(target) {
            const ang = Math.atan2(target.y - this.y, target.x - this.x);
            const bullet = {
                x: this.x + Math.cos(ang) * (this.width/2 + 10),
                y: this.y + Math.sin(ang) * (this.width/2 + 10),
                radius: 4,
                speed: BULLET_SPEED,
                angle: ang,
                color: '#aaffaa',
                isPlayerBullet: true, // supaya hanya melukai musuh
                update: function() {
                    this.x += Math.cos(this.angle) * this.speed;
                    this.y += Math.sin(this.angle) * this.speed;
                },
                draw: function() {
                    ctx.save();
                    ctx.fillStyle = this.color;
                    ctx.beginPath();
                    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                }
            };
            bullets.push(bullet);
        }
    };

    allies.push(ally);
    createFloatingText('ALLY DEPLOYED', ax, ay - 30, '#27ae60');
}

// Power-up types
const POWERUP_TYPES = {
    HEALTH: {
        color: '#ff5252',
        effect: (player) => {
            player.health = Math.min(100, player.health + 30);
            createFloatingText('HEALTH +30', player.x, player.y - 30, '#ff5252');
        },
        radius: 15
    },
    SPEED: {
        color: '#4CAF50',
        effect: (player) => {
            const originalSpeed = player.speed;
            player.speed *= 1.5;
            createFloatingText('SPEED BOOST!', player.x, player.y - 30, '#4CAF50');
            
            // Reset after 10 seconds
            setTimeout(() => {
                player.speed = originalSpeed;
            }, 10000);
        },
        radius: 15
    }
};

// Create level with walls
function createLevel() {
    walls = [];
    destructibleWallPositions = [];
    
    // Border walls (indestructible)
    walls.push(new Wall(0, GAME_HEIGHT/2, 20, GAME_HEIGHT, true)); // Left
    walls.push(new Wall(GAME_WIDTH, GAME_HEIGHT/2, 20, GAME_HEIGHT, true)); // Right
    walls.push(new Wall(GAME_WIDTH/2, 0, GAME_WIDTH, 20, true)); // Top
    walls.push(new Wall(GAME_WIDTH/2, GAME_HEIGHT, GAME_WIDTH, 20, true)); // Bottom
    
    // Random destructible walls
    for (let i = 0; i < 15; i++) {
        const x = 50 + Math.random() * (GAME_WIDTH - 100);
        const y = 50 + Math.random() * (GAME_HEIGHT - 200);
        
            // Pastikan tembok tidak muncul di dekat pemain
        if (Math.abs(x - player.x) > 100 || Math.abs(y - player.y) > 100) {
            const wall = new Wall(x, y, WALL_SIZE, WALL_SIZE, false);
            walls.push(wall);
            // Simpan posisi tembok yang bisa dihancurkan
            if (!wall.indestructible) {
                destructibleWallPositions.push({x, y});
            }
        }
    }
}

// Fungsi untuk respawn tembok yang hancur
function respawnWalls() {
    const now = Date.now();
    
    // Cek apakah sudah waktunya untuk respawn tembok (setiap 10 detik)
    if (now - lastWallRespawnTime < WALL_RESPAWN_TIME) {
        return;
    }
    
    // Hitung berapa tembok yang seharusnya ada
    const targetWallCount = 15; // Jumlah tembok awal
    const currentWallCount = walls.filter(wall => !wall.indestructible).length;
    
    // Jika tidak ada posisi yang tersimpan, tidak perlu respawn
    if (destructibleWallPositions.length === 0) {
        return;
    }
    
    // Jika tembok yang ada masih banyak, tidak perlu respawn
    if (currentWallCount >= targetWallCount) {
        lastWallRespawnTime = now; // Reset timer
        return;
    }
    
    // Buat salinan array posisi tembok yang bisa dihancurkan
    const availablePositions = [];
    
    // Cari posisi yang tidak memiliki tembok di atasnya
    for (const pos of destructibleWallPositions) {
        let positionOccupied = false;
        
        // Cek apakah sudah ada tembok di posisi ini
        for (const wall of walls) {
            if (Math.abs(wall.x - pos.x) < WALL_SIZE && Math.abs(wall.y - pos.y) < WALL_SIZE) {
                positionOccupied = true;
                break;
            }
        }
        
        // Jika posisi kosong, tambahkan ke daftar yang tersedia
        if (!positionOccupied) {
            availablePositions.push({...pos});
        }
    }
    
    // Respawn maksimal 3 tembok sekaligus untuk menghindari spawn berlebihan
    const wallsToRespawn = Math.min(availablePositions.length, 3);
    
    for (let i = 0; i < wallsToRespawn; i++) {
        if (availablePositions.length === 0) break;
        
        const randomIndex = Math.floor(Math.random() * availablePositions.length);
        const pos = availablePositions.splice(randomIndex, 1)[0];
        
        // Pastikan posisi tidak terlalu dekat dengan pemain
        const dx = player.x - pos.x;
        const dy = player.y - pos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 100) { // Minimal jarak 100 pixel dari pemain
            walls.push(new Wall(pos.x, pos.y, WALL_SIZE, WALL_SIZE, false));
            createParticles(pos.x, pos.y, '#8B4513', 10); // Efek visual saat tembok muncul
        }
    }
    
    // Update waktu respawn terakhir
    lastWallRespawnTime = now;
}


// Check if position is occupied by walls or player
function isPositionOccupied(x, y, radius) {
    // Check player collision
    const dx = x - player.x;
    const dy = y - player.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance < radius + player.width/2) return true;
    
    // Check wall collision
    for (const wall of walls) {
        const closestX = Math.max(wall.x - wall.width/2, Math.min(x, wall.x + wall.width/2));
        const closestY = Math.max(wall.y - wall.height/2, Math.min(y, wall.y + wall.height/2));
        
        const distanceX = x - closestX;
        const distanceY = y - closestY;
        const distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);
        
        if (distance < radius) return true;
    }
    
    return false;
}

// Spawn a power-up
function spawnPowerUp(forceSpawn = false) {
    // Sedikit ditingkatkan: ~40% saat tidak dipaksa
    if (!forceSpawn && Math.random() > 0.4) return;
    
    const powerUpTypes = Object.keys(POWERUP_TYPES);
    const type = powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)];
    
    let x, y;
    let validPosition = false;
    let attempts = 0;
    
    // Try to find a valid position
    while (!validPosition && attempts < 30) {
        x = 50 + Math.random() * (GAME_WIDTH - 100);
        y = 50 + Math.random() * (GAME_HEIGHT - 200);
        
        // Check if position is valid (not too close to player or walls)
        if (!isPositionOccupied(x, y, 40)) {
            // Additional check to ensure not too close to other power-ups
            let tooCloseToOther = false;
            for (const pu of powerUps) {
                const dx = pu.x - x;
                const dy = pu.y - y;
                if (Math.sqrt(dx * dx + dy * dy) < 80) {
                    tooCloseToOther = true;
                    break;
                }
            }
            validPosition = !tooCloseToOther;
        }
        attempts++;
    }
    
    if (validPosition) {
        const powerUp = {
            x: x,
            y: y,
            type: type,
            color: POWERUP_TYPES[type].color,
            radius: 15, // Fixed size for better collision
            effect: POWERUP_TYPES[type].effect,
            timer: 0,
            maxTime: 20 * 1000, // 20 seconds
            collected: false,
            
            update: function(deltaTime) {
                if (this.collected) return false;
                this.timer += deltaTime;
                return this.timer < this.maxTime;
            },
            
            draw: function() {
                if (this.collected) return;
                
                // Pulsing effect
                const pulse = Math.sin(Date.now() / 300) * 0.2 + 0.8;
                const size = this.radius * pulse;
                
                ctx.save();
                
                // Glow effect
                const gradient = ctx.createRadialGradient(
                    this.x, this.y, 0,
                    this.x, this.y, size * 1.5
                );
                gradient.addColorStop(0, this.color + 'CC');
                gradient.addColorStop(1, this.color + '00');
                
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(this.x, this.y, size * 1.5, 0, Math.PI * 2);
                ctx.fill();
                
                // Main circle
                ctx.fillStyle = this.color;
                ctx.beginPath();
                ctx.arc(this.x, this.y, size, 0, Math.PI * 2);
                ctx.fill();
                
                // Timer circle
                const progress = 1 - (this.timer / this.maxTime);
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(this.x, this.y, size + 5, -Math.PI/2, -Math.PI/2 + Math.PI * 2 * progress);
                ctx.stroke();
                
                // Icon
                ctx.fillStyle = 'white';
                ctx.font = 'bold ' + (size * 0.8) + 'px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                
                if (this.type === 'HEALTH') {
                    ctx.fillText('+', this.x, this.y - size * 0.1);
                } else if (this.type === 'SPEED') {
                    ctx.fillText('⚡', this.x, this.y);
                }
                
                ctx.restore();
            }
        };
        
        powerUps.push(powerUp);
        return true;
    }
    return false;
}

// Create floating text effect
function createFloatingText(text, x, y, color = '#FFFFFF', duration = 1500, fontSize = 24) {
    const floatingText = {
        x: x,
        y: y,
        text: text,
        color: color,
        alpha: 1,
        fontSize: fontSize,
        yVelocity: -0.5,
        createdAt: Date.now(),
        duration: duration,
        yVel: -0.5,
        
        update: function(deltaTime) {
            this.y += this.yVel;
            this.alpha -= 0.01;
            return this.alpha > 0;
        },
        
        draw: function() {
            ctx.save();
            ctx.fillStyle = this.color;
            ctx.globalAlpha = this.alpha;
            ctx.font = '16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(this.text, this.x, this.y);
            ctx.restore();
        }
    };
    
    floatingTexts.push(floatingText);
}

// Create particles for effects
function createParticles(x, y, color, count = 10) {
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1 + Math.random() * 3;
        
        particles.push({
            x: x,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            radius: 2 + Math.random() * 3,
            color: color,
            life: 1,
            decay: 0.02 + Math.random() * 0.03,
            
            update: function() {
                this.x += this.vx;
                this.y += this.vy;
                this.life -= this.decay;
                return this.life > 0;
            },
            
            draw: function() {
                ctx.save();
                ctx.globalAlpha = this.life;
                ctx.fillStyle = this.color;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        });
    }
}

// Check collision between two objects
function checkCollision(obj1, obj2) {
    // If obj1 is a bullet and obj2 is an enemy tank
    if (obj1.radius && obj2.width) {
        // Get the tank's half dimensions for collision box
        const halfWidth = obj2.width / 2;
        const halfHeight = obj2.height / 2;
        
        // Find the closest point on the tank to the bullet
        const closestX = Math.max(obj2.x - halfWidth, Math.min(obj1.x, obj2.x + halfWidth));
        const closestY = Math.max(obj2.y - halfHeight, Math.min(obj1.y, obj2.y + halfHeight));
        
        // Calculate the distance between the bullet and the closest point
        const distanceX = obj1.x - closestX;
        const distanceY = obj1.y - closestY;
        const distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);
        
        return distance < obj1.radius;
    }
    
    // Default circle collision for other cases
    const dx = obj1.x - obj2.x;
    const dy = obj1.y - obj2.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    return distance < obj1.radius + (obj2.radius || 0);
}

// Check collision between bullet and wall
function checkBulletWallCollision(bullet, wall) {
    // Find the closest point on the wall to the bullet
    const closestX = Math.max(wall.x - wall.width/2, Math.min(bullet.x, wall.x + wall.width/2));
    const closestY = Math.max(wall.y - wall.height/2, Math.min(bullet.y, wall.y + wall.height/2));
    
    // Calculate the distance between the bullet and the closest point
    const distanceX = bullet.x - closestX;
    const distanceY = bullet.y - closestY;
    const distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);
    
    return distance < bullet.radius;
}

// Spawn a boss tank
function spawnBossTank() {
    // Only spawn one boss at a time
    if (bossSpawned) return;
    
    // Random position at the top of the screen
    let x = GAME_WIDTH / 2 + (Math.random() * 200 - 100);
    let y = 100;
    
    const bossTank = {
        x: x,
        y: y,
        width: TANK_SIZE * 1.5 + SIZE_DELTA, // Bigger than normal tank with extra size
        height: TANK_SIZE * 1.5 + SIZE_DELTA,
        speed: 0.5 + Math.random() * 0.5, // Slower but more dangerous
        angle: Math.PI/2, // Face down
        health: 200 + (gameLevel * 20), // More health, scales with level
        maxHealth: 200 + (gameLevel * 20),
        lastShot: 0,
        shootDelay: 1500, // ms between shots (faster shooting)
        isBoss: true,
        bossType: Math.floor(Math.random() * bossTankImages.length), // Random boss image
        lastDirectionChange: 0,
        directionChangeInterval: 1000, // Change direction every second
        moveDirection: Math.random() * Math.PI * 2, // Random initial direction
        
        update: function() {
            const now = Date.now();
            
            // Change direction periodically
            if (now - this.lastDirectionChange > this.directionChangeInterval) {
                this.moveDirection = Math.random() * Math.PI * 2;
                this.lastDirectionChange = now;
            }
            
            // Move in current direction
            this.x += Math.cos(this.moveDirection) * this.speed;
            this.y += Math.sin(this.moveDirection) * this.speed;
            
            // Keep boss in bounds
            this.x = Math.max(this.width/2, Math.min(GAME_WIDTH - this.width/2, this.x));
            this.y = Math.max(this.height/2, Math.min(GAME_HEIGHT/2, this.y)); // Keep boss in top half
            
            // Shoot at player
            const dx = player.x - this.x;
            const dy = player.y - this.y;
            this.angle = Math.atan2(dy, dx);
            
            if (now - this.lastShot > this.shootDelay) {
                this.shoot();
                this.lastShot = now;
            }
        },
        
        draw: function() {
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(this.angle);
            
            // Draw boss tank image if loaded, otherwise draw rectangle as fallback
            const bossImage = bossTankImages[this.bossType];
            if (bossImage && bossImage.complete) {
                ctx.save();
                ctx.translate(0, 0);
                ctx.rotate(Math.PI/2);
                ctx.drawImage(bossImage, -this.width/2, -this.height/2, this.width, this.height);
                ctx.restore();
            } else {
                // Fallback rectangle if image not loaded
                ctx.fillStyle = '#8B0000'; // Dark red for boss
                ctx.fillRect(-this.width/2, -this.height/2, this.width, this.height);
                
                // Boss tank gun (fallback)
                ctx.fillStyle = '#333';
                ctx.fillRect(0, -4, this.width/2 + 15, 8);
            }
            
            // Health bar (thicker for boss)
            const healthBarWidth = this.width * 0.8;
            const healthBarHeight = 8; // Thicker health bar
            const healthBarX = -healthBarWidth / 2;
            const healthBarY = -this.height/2 - 15; // Position above tank
            
            // Health bar background
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(healthBarX - 2, healthBarY - 2, healthBarWidth + 4, healthBarHeight + 4);
            
            // Health bar (red part)
            ctx.fillStyle = '#ff0000';
            ctx.fillRect(healthBarX, healthBarY, healthBarWidth, healthBarHeight);
            
            // Health bar (green part)
            ctx.fillStyle = '#00ff00';
            const healthPercentage = this.health / this.maxHealth;
            ctx.fillRect(healthBarX, healthBarY, healthBarWidth * healthPercentage, healthBarHeight);
            
            // Health text
            ctx.fillStyle = '#ffffff';
            ctx.font = '10px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(
                `RIALO BOSS: ${Math.ceil(healthPercentage * 100)}%`, 
                0, 
                healthBarY - 5
            );
            
            ctx.restore();
        },
        
        shoot: function() {
            const bullet = {
                x: this.x + Math.cos(this.angle) * (this.width/2 + 10),
                y: this.y + Math.sin(this.angle) * (this.width/2 + 10),
                radius: 6, // Bigger bullets
                speed: BULLET_SPEED * 1.2, // Faster bullets
                angle: this.angle,
                color: '#ff0000',
                isPlayerBullet: false,
                isBossBullet: true, // Mark as boss bullet for more damage
                
                update: function() {
                    this.x += Math.cos(this.angle) * this.speed;
                    this.y += Math.sin(this.angle) * this.speed;
                },
                
                draw: function() {
                    ctx.save();
                    ctx.fillStyle = this.color;
                    ctx.beginPath();
                    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                    ctx.fill();
                    
                    // Add glow effect for boss bullets
                    ctx.shadowColor = '#ff0000';
                    ctx.shadowBlur = 10;
                    ctx.beginPath();
                    ctx.arc(this.x, this.y, this.radius * 0.7, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.shadowBlur = 0;
                    
                    ctx.restore();
                }
            };
            
            bullets.push(bullet);
            
            // Boss can shoot multiple bullets in a spread
            if (gameLevel >= 10) { // At higher levels, boss shoots more bullets
                for (let i = 0; i < 2; i++) {
                    const angleOffset = (i * 0.3) - 0.3; // -0.3 and 0.3 radians spread
                    const spreadBullet = {
                        ...bullet,
                        angle: this.angle + angleOffset
                    };
                    bullets.push(spreadBullet);
                }
            }
        }
    };
    
    enemies.push(bossTank);
    bossSpawned = true;
    
    // Play boss spawn sound effect if available
    createFloatingText(
        'RIALO BOSS INCOMING!',
        GAME_WIDTH / 2,
        GAME_HEIGHT / 2 - 50,
        '#ff0000',
        2000,
        36
    );
}

// Spawn an enemy
function spawnEnemy() {
    // Check for boss level
    if (gameLevel % 5 === 0 && !bossSpawned) {
        spawnBossTank();
        return;
    }
    
    // Only spawn if we have less than max enemies
    if (enemies.length >= maxEnemies) return;
    
    // Random position at the top of the screen
    let x, y;
    let validPosition = false;
    let attempts = 0;
    
    while (!validPosition && attempts < 50) {
        x = 50 + Math.random() * (GAME_WIDTH - 100);
        y = 50 + Math.random() * 100; // Only spawn at the top
        
        // Make sure enemies don't spawn on top of each other or walls
        validPosition = !isPositionOccupied(x, y, 40);
        attempts++;
    }
    
    if (validPosition) {
        // Pilih tipe musuh secara acak berdasarkan jumlah aset yang tersedia
        const enemyType = Math.floor(Math.random() * enemyTankImages.length); // 0..length-1
        
        const enemy = {
            type: enemyType, // Tambahkan properti type
            x: x,
            y: y,
            width: TANK_SIZE + SIZE_DELTA,
            height: TANK_SIZE + SIZE_DELTA,
            speed: 1 + Math.random() * 0.5,
            angle: Math.PI/2, // Face down
            health: 50,
            lastShot: 0,
            shootDelay: 2000, // ms between shots
            color: '#e74c3c',
            targetX: player.x,
            targetY: player.y,
            lastTargetUpdate: 0,
            
            update: function() {
                // Update target position every second
                if (Date.now() - this.lastTargetUpdate > 1000) {
                    this.targetX = player.x;
                    this.targetY = player.y;
                    this.lastTargetUpdate = Date.now();
                }
                
                // Move towards player
                const dx = this.targetX - this.x;
                const dy = this.targetY - this.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance > 0) {
                    this.angle = Math.atan2(dy, dx);
                    this.x += Math.cos(this.angle) * this.speed;
                    this.y += Math.sin(this.angle) * this.speed;
                }
                
                // Shoot at player
                if (Date.now() - this.lastShot > this.shootDelay) {
                    this.shoot();
                    this.lastShot = Date.now();
                }
                
                // Keep enemy in bounds
                this.x = Math.max(this.width/2, Math.min(GAME_WIDTH - this.width/2, this.x));
                this.y = Math.max(this.height/2, Math.min(GAME_HEIGHT - this.height/2, this.y));
            },
            
            draw: function() {
                ctx.save();
                ctx.translate(this.x, this.y);
                ctx.rotate(this.angle);
                
                // Draw enemy tank image if loaded, otherwise draw rectangle as fallback
                const enemyImage = enemyTankImages[this.type];
                if (enemyImage && enemyImage.complete) {
                    // Save the current context state
                    ctx.save();
                    // No color filter - use original image colors
                    // Move to the center of the tank
                    ctx.translate(0, 0);
                    // Rotate the tank (90 degrees to make it point up by default)
                    ctx.rotate(Math.PI/2);
                    // Draw the image centered
                    ctx.drawImage(enemyImage, -this.width/2, -this.height/2, this.width, this.height);
                    // Restore to the previous state
                    ctx.restore();
                } else {
                    // Fallback rectangle if image not loaded
                    ctx.fillStyle = this.color;
                    ctx.fillRect(-this.width/2, -this.height/2, this.width, this.height);
                    
                    // Enemy tank gun (fallback)
                    ctx.fillStyle = '#333';
                    ctx.fillRect(0, -3, this.width/2 + 10, 6);
                }
                
                // Health bar
                const healthBarWidth = this.width * 0.8;
                const healthBarHeight = 5;
                const healthBarX = -healthBarWidth / 2;
                const healthBarY = -this.height/2 - 10;
                
                ctx.fillStyle = '#ff0000';
                ctx.fillRect(healthBarX, healthBarY, healthBarWidth, healthBarHeight);
                
                ctx.fillStyle = '#00ff00';
                const healthPercentage = this.health / 50; // Enemy has 50 health
                ctx.fillRect(healthBarX, healthBarY, healthBarWidth * healthPercentage, healthBarHeight);
                
                ctx.restore();
            },
            
            shoot: function() {
                const bullet = {
                    x: this.x + Math.cos(this.angle) * (this.width/2 + 10),
                    y: this.y + Math.sin(this.angle) * (this.width/2 + 10),
                    radius: 4,
                    speed: BULLET_SPEED * 0.8, // Slightly slower than player bullets
                    angle: this.angle,
                    color: '#ff0000',
                    isPlayerBullet: false,
                    
                    update: function() {
                        this.x += Math.cos(this.angle) * this.speed;
                        this.y += Math.sin(this.angle) * this.speed;
                    },
                    
                    draw: function() {
                        ctx.save();
                        ctx.fillStyle = this.color;
                        ctx.beginPath();
                        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.restore();
                    }
                };
                
                bullets.push(bullet);
            }
        };
        
        enemies.push(enemy);
    }
}

// Update game state
function update() {
    if (gameOver || gamePaused) return;
    
    // Check for boss level and spawn boss if needed
    if (gameLevel % 5 === 0 && !bossSpawned && enemies.length < maxEnemies) {
        spawnBossTank();
    }
    
    // Cek dan respawn tembok yang hancur
    respawnWalls();
    
    // Update player
    player.update();
    
    // Update bullets
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        bullet.update();
        
        // Remove bullets that go off screen
        if (bullet.x < 0 || bullet.x > GAME_WIDTH || bullet.y < 0 || bullet.y > GAME_HEIGHT) {
            bullets.splice(i, 1);
            continue;
        }
        
        // Check bullet collision with walls
        for (let j = walls.length - 1; j >= 0; j--) {
            const wall = walls[j];
            if (checkBulletWallCollision(bullet, wall)) {
                // Remove bullet
                bullets.splice(i, 1);
                
                // Damage wall if not indestructible
                if (!wall.indestructible) {
                    wall.health--;
                    createParticles(bullet.x, bullet.y, '#8B4513', 5);
                    
                    // Remove wall if destroyed
                    if (wall.health <= 0) {
                        walls.splice(j, 1);
                        createParticles(wall.x, wall.y, '#8B4513', 15);
                    }
                }
                
                break;
            }
        }
        
        // Check player bullet collision with enemies
        if (bullet.isPlayerBullet) {
            for (let j = enemies.length - 1; j >= 0; j--) {
                const enemy = enemies[j];
                if (checkCollision(bullet, enemy)) {
                    // Remove bullet
                    bullets.splice(i, 1);
                    
                    // Damage enemy
                    enemy.health -= 25;
                    createParticles(bullet.x, bullet.y, '#e74c3c', 5);
                    
                    // Check if enemy is defeated
                    if (enemy.health <= 0) {
                        enemies.splice(j, 1);
                        score += 100;
                        enemyKillCount++;
                        createParticles(enemy.x, enemy.y, '#e74c3c', 20);
                        createFloatingText('+100', enemy.x, enemy.y - 30, '#f1c40f');
                        
                        // Chance to spawn a power-up when enemy is defeated (reduced rate)
                        if (Math.random() < 0.3) {
                            spawnPowerUp();
                        }
                    }
                    
                    break;
                }
            }
        }
        // Check enemy bullet collision with player or allies
        else if (!bullet.isPlayerBullet) {
            // Hit player?
            if (checkCollision(bullet, player)) {
                bullets.splice(i, 1);
                player.health -= 10;
                createParticles(bullet.x, bullet.y, '#3498db', 10);
                if (player.health <= 0) {
                    player.health = 0;
                    gameOver = true;
                    document.getElementById('gameOver').style.display = 'flex';
                    document.getElementById('finalScore').textContent = score;
                    cancelAnimationFrame(animationId);
                    return;
                }
            } else {
                // Hit any ally?
                let hitAlly = false;
                for (let a = allies.length - 1; a >= 0; a--) {
                    if (checkCollision(bullet, allies[a])) {
                        bullets.splice(i, 1);
                        allies[a].health -= 15;
                        createParticles(bullet.x, bullet.y, '#27ae60', 10);
                        if (allies[a].health <= 0) {
                            createFloatingText('ALLY DOWN', allies[a].x, allies[a].y - 25, '#ff5555');
                        }
                        hitAlly = true;
                        break;
                    }
                }
                if (hitAlly) {
                    // already handled
                }
            }
        }
    }
    
    // Update enemies
    for (let i = enemies.length - 1; i >= 0; i--) {
        enemies[i].update();
    }

    // Update allies
    for (let i = allies.length - 1; i >= 0; i--) {
        allies[i].update();
        // Hapus ally jika mati
        if (allies[i].health <= 0) {
            createParticles(allies[i].x, allies[i].y, '#27ae60', 15);
            allies.splice(i, 1);
        }
    }
    
    // Update power-ups
    for (let i = powerUps.length - 1; i >= 0; i--) {
        const powerUp = powerUps[i];
        const isAlive = powerUp.update(16); // 16ms ~ 60fps
        
        if (!powerUp.collected) {
            // Check player collision with power-up (using player's hitbox)
            const playerRadius = Math.max(player.width, player.height) / 2 * 0.8;
            const dx = player.x - powerUp.x;
            const dy = player.y - powerUp.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < playerRadius + powerUp.radius) {
                // Mark as collected and apply effect
                powerUp.collected = true;
                powerUp.effect(player);
                createParticles(powerUp.x, powerUp.y, powerUp.color, 20);
                createFloatingText(
                    powerUp.type === 'HEALTH' ? 'Health +30!' : 'Speed Boost!',
                    powerUp.x, powerUp.y - 30,
                    powerUp.color
                );
                
                // Play sound if available
                if (window.AudioContext) {
                    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                    const oscillator = audioCtx.createOscillator();
                    const gainNode = audioCtx.createGain();
                    
                    oscillator.type = 'sine';
                    oscillator.frequency.setValueAtTime(800, audioCtx.currentTime);
                    oscillator.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.1);
                    gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
                    
                    oscillator.connect(gainNode);
                    gainNode.connect(audioCtx.destination);
                    oscillator.start();
                    oscillator.stop(audioCtx.currentTime + 0.5);
                }
                
                // Remove after a short delay to allow for effects
                setTimeout(() => {
                    const index = powerUps.indexOf(powerUp);
                    if (index > -1) {
                        powerUps.splice(index, 1);
                    }
                }, 100);
                
                continue;
            }
        }
        
        // Remove expired power-ups
        if (!isAlive) {
            // Fade out effect before removing
            powerUp.alpha = (powerUp.maxTime - powerUp.timer) / 500; // Fade out over 500ms
            if (powerUp.alpha <= 0) {
                powerUps.splice(i, 1);
            }
        }
    }
    
    // Update particles
    for (let i = particles.length - 1; i >= 0; i--) {
        if (!particles[i].update()) {
            particles.splice(i, 1);
        }
    }
    
    // Update floating texts
    for (let i = floatingTexts.length - 1; i >= 0; i--) {
        if (!floatingTexts[i].update(16)) {
            floatingTexts.splice(i, 1);
        }
    }
    
    // Check for level up (only if not in boss level or boss is defeated)
    if (gameLevel % 5 !== 0 || !enemies.some(e => e.isBoss)) {
        if (enemyKillCount >= 5) {
            levelUp();
        }
    }
    
    // Spawn new enemies based on level
    const spawnChance = 0.01 + (gameLevel * 0.002); // Meningkatkan peluang spawn seiring level
    if (Math.random() < spawnChance && enemies.length < maxEnemies) {
        spawnEnemy();
    }
    
    // Spawn power-ups periodically (sedikit lebih sering, dan boleh hingga 3 aktif)
    if (Math.random() < 0.0007 && powerUps.length < 3) {
        spawnPowerUp();
    }
    
    // Update UI
    document.getElementById('health').textContent = Math.max(0, Math.ceil(player.health));
    document.getElementById('score').textContent = score;
    document.getElementById('level').textContent = gameLevel;
}

// Draw everything
function draw() {
    // Clear canvas
    ctx.fillStyle = '#2c3e50';
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    
    // Draw walls
    for (const wall of walls) {
        wall.draw();
    }
    
    // Draw power-ups
    for (const powerUp of powerUps) {
        powerUp.draw();
    }
    
    // Draw allies
    for (const ally of allies) {
        ally.draw();
    }
    
    // Draw bullets
    for (const bullet of bullets) {
        bullet.draw();
    }
    
    // Draw enemies
    for (const enemy of enemies) {
        enemy.draw();
    }
    
    // Draw player if alive
    if (player.health > 0) {
        player.draw();
    }
    
    // Draw particles
    for (const particle of particles) {
        particle.draw();
    }
    
    // Draw floating texts
    for (const text of floatingTexts) {
        text.draw();
    }
    
    // Draw UI
    ctx.fillStyle = 'white';
    ctx.font = '20px Arial';
    ctx.textAlign = 'right';
    ctx.fillText(`Level: ${gameLevel}`, GAME_WIDTH - 20, 30);
    
    // Draw health bar
    const healthBarWidth = 200;
    const healthBarHeight = 20;
    const healthBarX = 20;
    const healthBarY = 20;
    
    // Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(healthBarX, healthBarY, healthBarWidth, healthBarHeight);
    
    // Health
    const healthPercentage = player.health / 100;
    ctx.fillStyle = healthPercentage > 0.5 ? '#2ecc71' : healthPercentage > 0.2 ? '#f39c12' : '#e74c3c';
    ctx.fillRect(healthBarX, healthBarY, healthBarWidth * Math.max(0, healthPercentage), healthBarHeight);
    
    // Border
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    ctx.strokeRect(healthBarX, healthBarY, healthBarWidth, healthBarHeight);
    
    // Health text
    ctx.fillStyle = 'white';
    ctx.textAlign = 'left';
    ctx.fillText(`HP: ${Math.max(0, Math.ceil(player.health))}%`, healthBarX + 5, healthBarY + 16);

    // Pause overlay
    if (gamePaused) {
        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 36px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('PAUSED', GAME_WIDTH / 2, GAME_HEIGHT / 2);
        ctx.restore();
    }
}

// Game loop
let lastTime = 0;
function gameLoop(timestamp) {
    if (!gameRunning) return;
    
    // Calculate delta time for smooth animation
    const deltaTime = timestamp - lastTime;
    lastTime = timestamp;
    
    // Update game state
    update();
    
    // Draw everything
    draw();
    
    // Continue the game loop
    if (!gameOver) {
        animationId = requestAnimationFrame(gameLoop);
    }
}

// Start the game
function startGame() {
    // Reset game state
    gameRunning = true;
    gamePaused = false;
    gameOver = false;
    score = 0;
    gameLevel = 1;
    enemyKillCount = 0;
    
    // Clear all game objects
    bullets = [];
    enemies = [];
    allies = [];
    powerUps = [];
    particles = [];
    floatingTexts = [];
    
    // Reset player
    player.x = GAME_WIDTH / 2;
    player.y = GAME_HEIGHT - 100;
    player.angle = 0;
    player.health = 100;
    player.speed = 3;
    player.shootDelay = 500;
    
    // Create level
    createLevel();
    
    // Spawn initial enemies
    for (let i = 0; i < 3; i++) {
        spawnEnemy();
    }
    
    // Hide game over screen
    document.getElementById('gameOver').style.display = 'none';
    
    // Start game loop
    lastTime = performance.now();
    animationId = requestAnimationFrame(gameLoop);
}

// Event listeners
window.addEventListener('keydown', (e) => {
    keys[e.key] = true;
    
    // Prevent spacebar from scrolling the page
    if (e.key === ' ') {
        e.preventDefault();
    }
    
    // Restart game on R key when game over
    if (e.key === 'r' && gameOver) {
        startGame();
    }

    // Spawn ally with B key
    if ((e.key === 'b' || e.key === 'B') && gameRunning && !gameOver) {
        spawnAlly();
    }

    // Toggle pause with P
    if ((e.key === 'p' || e.key === 'P') && gameRunning && !gameOver) {
        gamePaused = !gamePaused;
    }
});

window.addEventListener('keyup', (e) => {
    keys[e.key] = false;
});

// Prevent arrow keys from scrolling the page
window.addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
    }
});

// Initialize game
function init() {
    // Set canvas size
    canvas.width = GAME_WIDTH;
    canvas.height = GAME_HEIGHT;
    
    // Start the game
    startGame();
    
    // Add click handler for restart button
    document.querySelector('#gameOver button').addEventListener('click', startGame);
}

// Level up function
function levelUp() {
    gameLevel++;
    maxEnemies = Math.min(5 + Math.floor(gameLevel / 2), 10); // Maksimal 10 musuh
    
    // Check if it's a boss level (every 5 levels)
    const isBossLevel = gameLevel % 5 === 0;
    
    if (isBossLevel) {
        createFloatingText(
            `BOSS LEVEL ${gameLevel}!`, 
            GAME_WIDTH / 2, 
            GAME_HEIGHT / 2, 
            '#ff0000',
            3000, // Show longer for boss level
            36    // Bigger font
        );
        bossSpawned = false; // Reset boss spawn flag
    } else {
        createFloatingText(
            `LEVEL ${gameLevel}!`, 
            GAME_WIDTH / 2, 
            GAME_HEIGHT / 2, 
            '#f1c40f'
        );
    }
    
    // Reset kill count for next level
    enemyKillCount = 0;
}

// Start the game when the page loads
window.addEventListener('load', init);
