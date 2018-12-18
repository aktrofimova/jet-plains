let app = new PIXI.Application(window.innerWidth, window.innerHeight, {backgroundColor : 0x1099bb});
document.body.appendChild(app.view);

const jetplainTexture = PIXI.Texture.fromImage('https://raw.githubusercontent.com/aktrofimova/ai-assets/master/jetplain.png');
const targetTexture = PIXI.Texture.fromImage('https://raw.githubusercontent.com/aktrofimova/ai-assets/master/target.png');
const ripTexture = PIXI.Texture.fromImage('https://raw.githubusercontent.com/aktrofimova/ai-assets/master/rip.png');

const small = {
    fontFamily: 'Courier',
    fontSize: 14,
    fill: 'white',
    align: 'left'
};

const medium = {
    fontFamily: 'Courier',
    fontSize: 24,
    fill: 'white',
    align: 'left'
};

const large = {
    fontFamily: 'Courier',
    fontSize: 35,
    fill: 'white',
    align: 'left'
};

let background = PIXI.Sprite.fromImage('https://raw.githubusercontent.com/aktrofimova/ai-assets/master/bg5.png');
background.width = app.screen.width;
background.height = app.screen.height;
app.stage.addChild(background);

let epochText = new PIXI.Text('Epoch #1', large);
epochText.x = 20;
epochText.y = app.screen.height - 50;

let helpText = new PIXI.Text(
        'r    - targets respawn\n' +
        'g    - dynamic targets\n' +
        'm(M) - (auto)mutation\n' +
        's(S) - (auto)selection\n' +
        'e(E) - (auto)evolution\n' +
        'p    - pause/resume\n' +
        'i    - info\n', medium);
helpText.x = 20;
helpText.y = app.screen.height - 250;
helpText.visible = false;

let hintText = new PIXI.Text('Press h for help', large);
hintText.x = app.screen.width - 350;
hintText.y = app.screen.height - 50;

window.addEventListener('resize', onResize);
function onResize() {
    app.renderer.resize(window.innerWidth, window.innerHeight);
    background.width = app.screen.width;
    background.height = app.screen.height;
}

let autoRespawnMode = true;
let dynamictargetsMode = false;
let autoMutationMode = true;
let autoSelectionMode = true;
let autoEvolutionMode = true;
let showInfoMode = false;
let paused = false;
let epoch = 1;

window.setInterval(function() { if (autoMutationMode) mutation(); }, 30000);
window.setInterval(function() { if (autoSelectionMode) selection(); }, 7000);
window.setInterval(function() { if (autoEvolutionMode) evolution(); }, 60000);

document.addEventListener('keydown', onKeyDown);
function onKeyDown(event) {
    if (event.keyCode == /* r= */ 82) {
        autoRespawnMode = !autoRespawnMode;
        showNotification('Auto respawn mode ' + (autoRespawnMode ? 'on' : 'off'));
    } else if (event.keyCode == /* d= */ 68) {
        dynamictargetsMode = !dynamictargetsMode;
        showNotification(dynamictargetsMode ? 'Dynamic targets' : 'Static targets');
    } else if (event.keyCode == /* m */ 77) {
        if (event.shiftKey) {
            autoMutationMode = !autoMutationMode;
            showNotification('Auto mutation mode ' + (autoMutationMode ? 'on' : 'off'));
        } else {
            mutation();
        }
    } else if (event.keyCode == /* s */ 83) {
        if (event.shiftKey) {
            autoSelectionMode = !autoSelectionMode;
            showNotification('Auto selection mode ' + (autoSelectionMode ? 'on' : 'off'));
        } else {
            selection();
        }
    } else if (event.keyCode == /* e */ 69) {
        if (event.shiftKey) {
            autoEvolutionMode = !autoEvolutionMode;
            showNotification('Auto evolution mode ' + (autoEvolutionMode ? 'on' : 'off'));
        } else {
            evolution();
        }
    } else if (event.keyCode == /* p */ 80) {
        paused = !paused;
        if (paused) {
            app.stop();
        } else {
            app.start();
        }
    } else if (event.keyCode == /* i */ 73) {
        showInfoMode = !showInfoMode;
    } else if (event.keyCode == /* h */ 72) {
        helpText.visible = !helpText.visible;
    }
}

let jetplains = [];
let targets = [];

function createJetplain() {
    let sprite = new PIXI.Sprite(jetplainTexture);
    sprite.scale.set(0.7);
    let text = new PIXI.Text('', small);
    text.visible = false;
    sprite.anchor.set(0.5);
    let {x, y} = randomPoint();
    sprite.position.set(x, y);
    let rotation = randomRotation();
    sprite.rotation = rotation;

    app.stage.addChild(sprite);
    app.stage.addChild(text);
    return {
        sprite,
        rotation,
        speed: 2 * Math.random(),
        eaten: 0,
        lifetime: 0,
        brain: randomBrain(4, 2),
        info: text,
        think: function (jetplain, target) {
            let a1 = jetplain == null ? 0 : angle(this.sprite, jetplain.sprite.position);
            let d1 = jetplain == null ? 0 : distance(this.sprite.position, jetplain.sprite.position) / 1000;
            let a2 = target == null ? 0 : angle(this.sprite, target.sprite.position);
            let d2 = target == null ? 0 : distance(this.sprite.position, target.sprite.position) / 1000;
            let delta = propagate(nj.array([a1, d1, a2, d2]), this.brain);
            let deltaRotation = delta.get(0);
            let deltaSpeed = delta.get(1);
            this.rotation = lerp(this.rotation, this.rotation + deltaRotation);
            this.speed = Math.max(0, Math.min(5, lerp(this.speed, this.speed + deltaSpeed)));
        },
        kill: function() {
            app.stage.removeChild(this.sprite);
            app.stage.removeChild(this.info);
            showRip(this.sprite.position);
        },
        energy: function() { return (1 + this.eaten) / this.lifetime * 1000; }
    };
}

function createTargetAt({x, y}) {
    let sprite = new PIXI.Sprite(targetTexture);
    sprite.scale.set(0.7);
    sprite.anchor.set(0.5);
    sprite.position.set(x, y);
    let rotation = randomRotation();
    sprite.rotation = rotation;

    app.stage.addChild(sprite);
    return {
        sprite,
        rotation,
        kill: function() { app.stage.removeChild(sprite); }
    };
}

function createTarget() {
    return createTargetAt(randomPoint());
}

function gameSetup() {
    for (let i = 0; i < 10; i++) {
        jetplains.push(createJetplain());
    }
    for (let i = 0; i < 30; i++) {
        targets.push(createTarget());
    }
}
gameSetup();

app.renderer.plugins.interaction.on('mousedown', createTargetAtPoint);
function createTargetAtPoint() {
    targets.push(createTargetAt(app.renderer.plugins.interaction.mouse.global));
}

// Listen for animate update
app.ticker.add(function(delta) {
    let targetsKilled = new Set();
    for (let i = 0; i < jetplains.length; i++) {
        let jetplain = jetplains[i];
        jetplain.info.text = Math.round(jetplain.energy() * 1000) / 1000;
        jetplain.info.x = jetplain.sprite.position.x - 20;
        jetplain.info.y = jetplain.sprite.position.y - 35;
        jetplain.info.visible = showInfoMode;

        let closesttarget = null;
        for (let j = 0; j < targets.length; j++) {
            let target = targets[j];
            if (!canSee(jetplain.sprite, target.sprite.position)) {
                continue;
            }
            if (closesttarget == null || distance(jetplain.sprite.position, target.sprite.position) < distance(jetplain.sprite.position, closesttarget.sprite.position)) {
                closesttarget = target;
            }
            // Mark killed targets to remove them later
            if (collide(jetplain.sprite, target.sprite)) {
                targetsKilled.add(target);
                jetplain.eaten++;
            }
        }
        let closestjetplain = null;
        for (let j = 0; j < jetplains.length; j++) {
            let p = jetplains[j];
            if (!canSee(jetplain.sprite, p.sprite.position)) {
                continue;
            }
            if (closestjetplain == null || distance(jetplain.sprite.position, p.sprite.position) < distance(jetplain.sprite.position, closestjetplain.sprite.position)) {
                closestjetplain = p;
            }
        }
        jetplain.think(closestjetplain, closesttarget);
    }
    // Remove killed targets
    targetsKilled = [...targetsKilled];
    for (let i = 0; i < targetsKilled.length; i++) {
        let target = targetsKilled[i];
        target.kill();
        targets.splice(targets.indexOf(target), 1);
        if (autoRespawnMode) {
            targets.push(createTarget());
        }
    }

    for (let i = 0; i < jetplains.length; i++) {
        let jetplain = jetplains[i];
        jetplain.sprite.rotation = jetplain.rotation;
        // Move jetplains
        jetplain.sprite.position.x += Math.cos(jetplain.rotation) * jetplain.speed * delta;
        jetplain.sprite.position.y += Math.sin(jetplain.rotation) * jetplain.speed * delta;
        jetplain.sprite.position = sanitizePosition(jetplain.sprite.position);
        jetplain.lifetime += Math.floor(delta);
    }
    for (let i = 0; i < targets.length; i++) {
        let target = targets[i];
        if (dynamictargetsMode) {
            // Move targets
            target.sprite.position.x += Math.cos(target.rotation) * delta;
            target.sprite.position.y += Math.sin(target.rotation) * delta;
            target.sprite.position = sanitizePosition(target.sprite.position);
        }
    }
});

function collide(sprite1, sprite2) {
    return distance(sprite1.position, sprite2.position) < 32;
}

function distance(pos1, pos2) {
    let sqr = function(x) { return x * x; };
    return Math.sqrt(sqr(pos1.x - pos2.x) + sqr(pos1.y - pos2.y));
}

function length(pos) {
    return distance({x: 0, y: 0}, pos);
}

function diff(pos1, pos2) {
    return {
        x: pos2.x - pos1.x,
        y: pos2.y - pos1.y
    };
}

function cosine(obj, pos) {
    let d = diff(obj.position, pos);
    return (Math.cos(obj.rotation)*d.x + Math.sin(obj.rotation)*d.y) / length(d);
}

function sine(obj, pos) {
    let d = diff(obj.position, pos);
    return (Math.cos(obj.rotation)*d.y - Math.sin(obj.rotation)*d.x) / length(d);
}

function sanitizePosition({x, y}) {
    return {
        x: (x % app.screen.width + app.screen.width) % app.screen.width,
        y: (y % app.screen.height + app.screen.height) % app.screen.height
    };
}

function randomPoint() {
    return {
        x: Math.random() * app.screen.width,
        y: Math.random() * app.screen.height
    };
}

function randomRotation() {
    return 2 * Math.PI * Math.random();
}

function random(val) {
    return Math.floor(Math.random() * val);
}

let oldText = null;

function showNotification(msg) {
    app.stage.removeChild(oldText);
    var text = new PIXI.Text(msg, large);
    text.x = 20;
    text.y = 20;
    app.stage.addChild(text);
    window.setTimeout(function() { app.stage.removeChild(text); }, 2500);
    oldText = text;
}

function showRip({x, y}) {
    var sprite = new PIXI.Sprite(ripTexture);
    sprite.position.set(x, y);
    app.stage.addChild(sprite);
    window.setTimeout(function() { app.stage.removeChild(sprite); }, 2500);
}

function propagate(input, nn) {
    for (let i = 0; i < nn.length; i++) {
        input = nj.tanh(nj.dot(nj.concatenate([1, input]), nn[i]));
    }
    return input;
}

function randomLayer(shape) {
    return nj.random(shape).subtract(0.5);
}

function randomBrain(input, output) {
    return [randomLayer([input + 1, 10]),
            randomLayer([11, 20]),
            randomLayer([21, 10]),
            randomLayer([11, output])];
}

function lerp(val1, val2) {
    return val1 + (val2 - val1) * 0.7;
}

function canSee(obj, pos) {
    return cosine(obj, pos) >= 0;
}

function angle(obj, pos) {
    let c = cosine(obj, pos);
    let s = sine(obj, pos);
    return s < 0 ? -Math.acos(c) : Math.acos(c);
}

function mutateBrain(brain) {
    for (let i = 0; i < brain.length; i++) {
        if (Math.random() < 0.1) {
            brain[i] = randomLayer(brain[i].shape);
        }
    }
}

function mutation() {
    showNotification('Mutation');
    mutateBrain(jetplains[random(jetplains.length)].brain);
}

function selection() {
    showNotification('Selection & Crossing');
    jetplains.sort(byEnergy);
    let jetplain = cross(jetplains[0], jetplains[1]);

    let worst = jetplains[jetplains.length - 1];
    worst.kill();
    jetplains.splice(jetplains.indexOf(worst), 1);
    jetplains.push(jetplain);
}

// Descending
function byEnergy(p1, p2) {
    return p1.energy() > p2.energy() ? -1 : 1;
}

function crossBrains(b1, b2) {
    b3 = [];
    for (let i = 0; i < b1.length; i++) {
        if (Math.random() < 0.5) {
            b3.push(b1[i].clone());
        } else {
            b3.push(b2[i].clone());
        }
    }
    return b3;
}

function cross(jetplain1, jetplain2) {
    let brain = crossBrains(jetplain1.brain, jetplain2.brain);
    let jetplain = createJetplain();
    jetplain.brain = brain;
    return jetplain;
}

function evolution() {
    showNotification('Evolution');
    jetplains.sort(byEnergy);
    let best = jetplains.slice(0, jetplains.length / 2);
    let worst = jetplains.slice(jetplains.length / 2);

    for (let i = 0; i < worst.length; i++) {
        let j = random(best.length);
        let k = random(best.length);
        let jetplain = cross(best[j], best[k]);
        jetplains.push(jetplain);
    }

    for (let i = 0; i < worst.length; i++) {
        worst[i].kill();
        jetplains.splice(jetplains.indexOf(worst[i]), 1);
    }
    epoch++;
    epochText.text = 'Epoch #' + epoch;
}

// Bring to the front
app.stage.addChild(epochText);
app.stage.addChild(helpText);
app.stage.addChild(hintText);
