let timerStates = {
    IDLE:       0,
    RUNNING:    1,
    PAUSED:     2,
};

let level;
let score;

let gameTimer = {
    timer:          undefined,
    stepFrequency:  3,
    startTime:      0,
    state:          timerStates.IDLE,
    
    start() {
        this.runStep(1000/this.stepFrequency);
    },
    runStep(duration, nextDuration = duration) {
        this.timer = window.setTimeout(() => {
            executeGameStep(); 
            this.runStep(nextDuration);
        }, duration);
        this.startTime = Date.now();
        document.getElementById("pausedOverlay").style.display = "none";
        this.state = timerStates.RUNNING;
    },
    pause() {
        if (this.state != timerStates.RUNNING) return;
        if (this.timer) {
            window.clearTimeout(this.timer);
        }
        this.remainingTime = (this.startTime + 1000/this.stepFrequency) - Date.now(); // TODO: Fix. Assumes the timer was stopped during period of normal step duration.
        console.log(this.remainingTime); // TEST TEST
        document.getElementById("pausedOverlay").style.display = "block";
        this.state = timerStates.PAUSED;
    },
    resume() {
        if (this.state != timerStates.PAUSED) return;
        // complete last step, then continue as normal
        this.runStep(this.remainingTime, 1000/this.stepFrequency);
        this.startTime = Date.now();
    },
};

function initialize() {
    let canvas = document.querySelector('#game');
    canvas.width = playArea.width * (playArea.SQUARE_SIDE_LEN + 1);
    canvas.height = playArea.height * (playArea.SQUARE_SIDE_LEN + 1);
    if (!canvas.getContext) {
        return;
    }
    ctx = canvas.getContext('2d');
    
    this.level = 0;
    this.score = 0;
    playArea.initialize();
    playArea.currentTile = spawnRandomTile();
    playArea.addTile(playArea.currentTile);
    playArea.drawBlocks();

    document.body.onkeydown = handleInput;
    gameTimer.start();
    gameTimer.pause();
}

function spawnRandomTile() {
    let newType = getRandomTileType();
    newTile = {
        type: newType,
        rotation: "UP",
        x: 3,
        y: 0,
    };
    return newTile;
}

function getRandomTileType() {
    let tileList = Object.getOwnPropertyNames(tiles);
    tileList.splice(tileList.findIndex(e => e == 'X'),1);
    let rnd = Math.round(0.5 + tileList.length*Math.random()) - 1;
    return tileList[rnd];
}

let playArea = {
    SQUARE_SIDE_LEN: 20,
    height: 22,
    width: 10,
    blocks: [],
    
    initialize: function() {
        let emptyRow = [];
        for(let x=0; x<playArea.width; x++){
            emptyRow.push('X');
        }
        for(let y=0; y<playArea.height; y++){
            playArea.blocks[y] = emptyRow.slice();
        }
    },
    getTranslatedTile(tileInfo,direction) {
        let newTile = Object.assign({}, tileInfo);
        switch(direction) {
            case DOWN:  newTile.y += 1;
                        break;
            case LEFT:  newTile.x -= 1;
                        break;
            case RIGHT: newTile.x += 1;
                        break;
        }
        return newTile;
    },
    getRotatedTile(tileInfo,direction) {
        let newTile = Object.assign({}, tileInfo);
        let rotations = ["UP","RIGHT","DOWN","LEFT"];
        let currentRotationIndex = rotations.findIndex(rot => rot == newTile.rotation);
        switch(direction) {
            case LEFT:  currentRotationIndex--;
                        break;
            case RIGHT: currentRotationIndex++;
                        break;
        }
        newTile.rotation = rotations[(rotations.length + currentRotationIndex) % rotations.length];
        return newTile;
    },
    addTile(tileInfo) {
        let [x,y,type,rotation] = [tileInfo.x,tileInfo.y,tileInfo.type,tileInfo.rotation];
        let shape = tiles[type][rotation];
        for(let dy=0; dy<shape.length; dy++){
            for(let dx=0; dx<shape[dy].length; dx++){
                if (shape[dy][dx] == '1') {
                    playArea.blocks[y+dy][x+dx] = type;
                }
            }
        }
    },
    removeTile(tileInfo) {
        let [x,y,type,rotation] = [tileInfo.x,tileInfo.y,tileInfo.type,tileInfo.rotation];
        let shape = tiles[type][rotation];
        for(let dy=0; dy<shape.length; dy++){
            for(let dx=0; dx<shape[dy].length; dx++){
                if (shape[dy][dx] == '1') {
                    playArea.blocks[y+dy][x+dx] = 'X';
                }
            }
        }
    },
    rowsCompleted() {
        let rows = [];
        let blocks = playArea.blocks;
        let blockCount = 0;
        for(y = playArea.height-1; y >= 0; y--, blockCount = 0){
            for(x = 0; x < playArea.width; x++) {
                blockCount += blocks[y][x] != 'X' ? 1 : 0;
            }
            if (blockCount == playArea.width) {
                rows.push(y);
            } else if (blockCount == 0) {
                return rows; // top of tile stack reached -> no clearable rows here and above
            }
        }
        return rows;
    },
    deleteRow(rowNumber) { // TODO: Fix crash here
        playArea.blocks.splice(rowNumber,1);
        /*for(let y = rowNumber; y > 0; y--) {
            for(let x = 0; x < playArea.width; x++) {
                playArea.blocks[y][x] = playArea.blocks[y-1][x];
            }
        }*/
        playArea.blocks.unshift([]);
        for(let x = 0; x < playArea.width; x++) {
            playArea.blocks[0][x] = 'X';
        }
    },
    drawBlocks: function() {
        clearPlayArea();
        drawGrid();
        for(let y=0; y<playArea.height; y++){
            for(let x=0; x<playArea.width; x++){
                let blockKey = playArea.blocks[y][x];
                if (blockKey != 'X'){
                    let block = tiles[blockKey].block;
                    drawBlock(x,y, block);
                }
            }
        }
    },
};

const UP    = 0;
const LEFT  = 1;
const RIGHT = 2;
const DOWN  = 3;
function handleInput(e) {
    let direction;
    if (gameTimer.state == timerStates.PAUSED) {
        if (e.key.toLowerCase() == 'p') {
            gameTimer.resume();
        }
        return;
    }
    
    switch(e.key){
        case 'a':       direction = LEFT;
                        break;
        case 'd':       direction = RIGHT;
                        break;
        case 's':       direction = DOWN;
                        break;
        case 'e':       rotateCurrentTile(RIGHT);
                        break;
        case 'q':       rotateCurrentTile(LEFT);
                        break;
        case 'p':       gameTimer.pause();
                        break;                     
    }
    let newTile = playArea.getTranslatedTile(playArea.currentTile, direction);
    updateCurrentTilePosition(newTile);
}

function updateCurrentTilePosition(newTile){
    if (!doesCollide(playArea.currentTile, newTile)){
        updateTile(playArea.currentTile, newTile);
    } else if(newTile.y > playArea.currentTile.y) {
        clearRows();
        playArea.currentTile = spawnRandomTile();
    }
}

// game loop (periodically called by timer)
function executeGameStep(){
    let newTile = playArea.getTranslatedTile(playArea.currentTile, DOWN);
    updateCurrentTilePosition(newTile);
}
function rotateCurrentTile(direction){
    newTile = playArea.getRotatedTile(playArea.currentTile, direction);
    if (!doesCollide(playArea.currentTile, newTile)) {
        updateTile(playArea.currentTile, newTile);
    }
}
function updateTile(targetTile, newTile){
    playArea.removeTile(targetTile);
    Object.assign(targetTile, newTile);
    playArea.addTile(targetTile);
    playArea.drawBlocks();
}
function clearRows() {
    while(true) { // check for and delete completed rows
        // TODO: Score extra points
        let rows = playArea.rowsCompleted();
        if (rows <= 0) {
            break;
        }
        rows.forEach(rowNumber => {
            playArea.deleteRow(rowNumber);
        });
        this.score += scoreRows(rows.length);
    }
    document.getElementById("score").value = this.score;
}

function scoreRows(clearedRowsCount) {
    let baseScore;
    switch(clearedRowsCount){
        case 1:     baseScore = 40;
                    break;
        case 2:     baseScore = 100;
                    break;
        case 3:     baseScore = 300;
                    break;
        case 4:     baseScore = 1200;
                    break;
        default:    return 0;
    }
    return baseScore * (this.level + 1);
}

function doesCollide(oldTile, newTile) {
    if (!newTile || !oldTile) {
        return false;
    }

    let [xAnchor,yAnchor,type,rotation] = [newTile.x,newTile.y,newTile.type,newTile.rotation];
    let shape = tiles[type][rotation];
    let [xAnchorOld,yAnchorOld,typeOld,rotationOld] = [oldTile.x,oldTile.y,oldTile.type,oldTile.rotation];
    let shapeOld = tiles[typeOld][rotationOld];
    let xDiff = xAnchor - xAnchorOld;
    let yDiff = yAnchor - yAnchorOld;
    
    for(let dy=0; dy<shape.length; dy++){
        for(let dx=0; dx<shape[dy].length; dx++){
            if (shape[dy][dx] == '1') {
                [y,x] = [yAnchor + dy, xAnchor + dx];
                
                let isInBounds = (y >= 0 && y < playArea.height) && (x >= 0 && x < playArea.width);
                if (!isInBounds) 
                    return true;
                let isOccupied = playArea.blocks[y][x] != 'X';
                if (!isOccupied) 
                    continue;
                [yOld, xOld] = [yDiff + dy, xDiff + dx]; // examined point in old shape's coordinate system
                let isInOldBlockArea = 
                        yOld >= 0 && yOld < shapeOld.length
                    &&  xOld >= 0 && xOld < shapeOld[0].length;
                if (!isInOldBlockArea)
                    return true;
                let isOldTileBlock = shapeOld[yOld][xOld] == '1';
                if (!isOldTileBlock)
                    return true;
            }
        }
    }
    return false;
}

function drawTile(tileInfo) {
    let [x,y,type,rotation] = [tileInfo.x,tileInfo.y,tileInfo.type,tileInfo.rotation];
    let shape = tiles[type][rotation];
    for(let dy=0; dy<shape.length; dy++){
        for(let dx=0; dx<shape[dy].length; dx++){
            if (shape[dy][dx] == '1') {
                drawBlock(x+dx,y+dy,type.block);
            }
        }
    }
}

function clearPlayArea() {
    ctx.clearRect(0, 0, // TODO: couple to (as of yet non-existant) coords of playArea
        playArea.width * (playArea.SQUARE_SIDE_LEN + 1), 
        playArea.height * (playArea.SQUARE_SIDE_LEN + 1)
    );
}
function drawGrid() {
    let strokeStyle = tiles['X'].block.strokeStyle;
    let xDiv = 1 + tiles['X'].block.width; // extra pixel because of block border
    let yDiv = 1 + tiles['X'].block.height;
    let playAreaWidthPx = xDiv * playArea.width;
    let playAreaHeightPx = yDiv * playArea.height;
    for(let i = 0; i <= playArea.height; i++){
        let y = i * yDiv;
        drawLine([0,y], [playAreaWidthPx,y], strokeStyle);
    }
    for(let i = 0; i <= playArea.width; i++){
        let x = i * xDiv;
        drawLine([x,0], [x,playAreaHeightPx], strokeStyle);
    }
}
function drawLine([x1,y1], [x2,y2], strokeStyle){
    ctx.strokeStyle = strokeStyle;
    ctx.beginPath();
    ctx.moveTo(x1,y1);
    ctx.lineTo(x2,y2);
    ctx.stroke();
}


// Draw square block whose upper left corner sits at coordinates x,y.
function drawBlock(x, y, block) {
    ctx.strokeStyle = block.strokeStyle;
    ctx.fillStyle = block.fillStyle;
    ctx.beginPath();
    ctx.rect(1 + x * (1 + block.width), 1 + y * (1+block.height), block.width, block.height); // extra pixels because of border width
    ctx.stroke();
    ctx.fill();
}

let tiles = {
X:  {
        block: {
            fillStyle:      'transparent',
            strokeStyle:    'LightGray',
        },
    },

I:  {
        block: {
            fillStyle:      'cyan',
        },
        UP:     ['0000','1111','0000','0000'],
        RIGHT:  ['0010','0010','0010','0010'],
        DOWN:   ['0000','0000','1111','0000'],
        LEFT:   ['0100','0100','0100','0100'],
    },
J:  {
        block: {
            fillStyle:      'blue',
            strokeStyle:    'grey',
        },
        UP:    ['100','111','000'],
        RIGHT: ['011','010','010'],
        DOWN:  ['000','111','001'],
        LEFT:  ['010','010','110'],
    },
L:  {
        block: {
            fillStyle:      'orange',
        },
        UP:    ['001','111','000'],
        RIGHT: ['010','010','011'],
        DOWN:  ['000','111','100'],
        LEFT:  ['110','010','010'],
    },
O:  {
        block: {
            fillStyle:      'yellow',
        },
        UP:    ['0110','0110','0000'],
        RIGHT: ['0110','0110','0000'],
        DOWN:  ['0110','0110','0000'],
        LEFT:  ['0110','0110','0000'],
    },
S:  {
        block: {
            fillStyle:      'green',
        },
        UP:    ['011','110','000'],
        RIGHT: ['010','011','001'],
        DOWN:  ['000','011','110'],
        LEFT:  ['100','110','010'],
    },
T:  {
        block: {
            fillStyle:      'purple',
        },
        UP:    ['010','111','000'],
        RIGHT: ['010','011','010'],
        DOWN:  ['000','111','010'],
        LEFT:  ['010','110','010'],
    },
Z:  {
        block: {
            fillStyle:      'red',
        },
        UP:    ['110','011','000'],
        RIGHT: ['001','011','010'],
        DOWN:  ['000','110','011'],
        LEFT:  ['010','110','100'],
    },
};
// add shared properties
Object.keys(tiles).forEach(key => {
    // only add to properties representing tiles
    if (!tiles[key].hasOwnProperty('block')) {
        return;
    }
    let block = tiles[key].block;
    block.strokeStyle   = !block.strokeStyle ? 'black' : block.strokeStyle;
    block.width         = !block.width ? playArea.SQUARE_SIDE_LEN : block.width;
    block.height        = !block.height ? playArea.SQUARE_SIDE_LEN : block.height;
});

document.onload += initialize;
