/*global g*/
g.init = function() {
	g.ui.bz=32
    g.ui.blocksInView=10
    g.ui.hudWidth = 50;
    g.ui.scale = {x: 2, y: 2};
    g.ui.width=g.ui.hudWidth+g.ui.blocksInView*g.ui.bz;
    g.ui.canvas.width=g.ui.width*g.ui.scale.x;
    g.ui.height=g.ui.blocksInView*g.ui.bz;
    g.ui.canvas.height=g.ui.height*g.ui.scale.y;
    g.ui.canvas.style.position = "absolute";
    if (g.ui.win.width>g.ui.width*g.ui.scale.x) g.ui.canvas.style.left = g.ui.win.width/2-0.5*g.ui.width*g.ui.scale.x + "px";
    if (g.ui.win.height>g.ui.height*g.ui.scale.y) g.ui.canvas.style.top = g.ui.win.height/2-0.5*g.ui.height*g.ui.scale.y + "px";

	g.ctx.scale(g.ui.scale.x, g.ui.scale.y);
	g.ctx.translate(g.ui.hudWidth, 0);
	// We want pixelated scaling:
	g.ctx.imageSmoothingEnabled=false

	g.ImageLoader.add("tilemap", "./tilemap.png");
	g.ImageLoader.add("sprites", "./spritemap.png");

	return ()=>{g.ready()}
}
g.ready = function() {
    g.restart(false)
};
g.restart = function(title) {
	// Cleanup
	g.Halt();
    g.scene = new g.Scene();
    g.loadMap();
    g.drawMap();
    g.level=0;
    g.Start();
	if (title) {
        g.state="title";
		g.title = g.scene.add(new GameTitle());
	} else {
        // New Game
        g.camera = g.scene.add(new Camera({x: 24*g.ui.bz, w: g.ui.blocksInView*g.ui.bz, h: g.ui.blocksInView*g.ui.bz, box: 200}));
        g.collider = g.scene.add(new Collider);
		g.manager = g.scene.add(new GameManager());
		g.minimap = g.scene.add(new MiniMap());
        g.player = g.scene.add(new Player({x: 28*g.ui.bz, y: 37*g.ui.bz, velocity: 2}));
        g.state="play";
	}
	
};
g.GameOver = function(msg) {
    g.scene.entities.length=0;
    this.state="gameover"
    g.msg=msg;
}
g.preGameRender = function(ctx) {
    // Draw background
    if(g.state!="play") return;
    if(!g.camera) return;
    g.ctx.drawImage(g.c0, g.camera.x, g.camera.y, 320, 320, 0, 0, 320, 320)
};
g.postGameRender = function(ctx) {
    if (this.state=="gameover") {
        delete g.camera;
        g.rect(0, 0, g.ui.width, g.ui.height, '#333')
        g.ctx.fillStyle='#EEE';
        g.ctx.font='20pt Consolas';
        g.ctx.fillText("GAME OVER", 40, g.ui.height/2-10);
        g.ctx.font='12pt Consolas';
        g.ctx.fillText(g.msg, 20, g.ui.height/2+20);
        g.ctx.fillText("Press <SPACEBAR> to play again...", 20, g.ui.height/2+40);
        return
    }
    if(!g.minimap) return;
    g.minimap.draw(ctx);
};
g.loadMap = function() {
    let canvas = document.createElement("canvas");
    let ctx = canvas.getContext("2d");;
    let img = g.ImageLoader.get["tilemap"];
    ctx.drawImage(img, 0, 0)
    let data = ctx.getImageData(0, 0, img.width, img.height).data;
    let palette = [];
    g.map = [];
    for (let y = 0; y < img.height; y++) {
        let row = []; row.length=img.width;
        for (let x = 0; x < img.width; x++) {
            let i = (y*img.width+x)*4;
            let col = [data[i], data[i+1], data[i+2], data[i+3]]
            // First row of image is the palette
            if (y==0 && x<img.width) palette.push(col)
            else {
                // Find the color
                for (let p=0; p<palette.length; p++)
                    if (col[0] === palette[p][0] && col[1] === palette[p][1] && col[2] === palette[p][2]) {
                        row[x]=p;
                        break;
                    }
            }
        }
        if (y>0) g.map.push(row)
    }
};
g.rect=function(x,y,w,h,c) {g.ctx.fillStyle=c;g.ctx.fillRect(x,y,w,h)}
g.drawMap = function() {
    // Draw static map to hidden c0
    let bz = g.ui.bz;
    let mw = g.map[0].length;
    let mh = g.map.length;
    let c0 = document.createElement("canvas");g.c0=c0;
    let ctx = c0.getContext("2d");
    c0.width = mw * bz;
    c0.height = mh * bz;

    g.rect(0, 0, c0.width, c0.height, '#DDD');
    let spriteSheet = g.ImageLoader.get["sprites"];
    
    // Land background is green
    for (let y = 0; y < mh; y++)
        for (let x = 0; x < mw; x++)
            if (g.map[y][x]==3) // House, draw green square
                ctx.drawImage(spriteSheet, 2*bz, 3*bz, bz, bz, x*bz, y*bz, bz, bz);
            else if (g.map[y][x]>=2) // If not sea, sand draw grass
                ctx.drawImage(spriteSheet, 2*bz, 0*bz, bz, bz, x*bz, y*bz, bz, bz);
    for (let y = 0; y < mh; y++)
        for (let x = 0; x < mw; x++) {
            ctx.globalAlpha=1;
            let y1 = 0;
            let y2 = 1;
            // Don't put any block to the right of the pizzeria
            if (x>0 && g.map[y][x-1]==15) {
                g.scene.add({tag: "block", x: x*g.ui.bz, y: y*g.ui.bz, w: g.ui.bz, h: g.ui.bz});
                continue;
            }
            let rand = Math.random();
            // Sea, Sand and Grass alpha variations
            if (g.map[y][x]==0) ctx.globalAlpha=0.9 + rand*0.1;
            if (g.map[y][x]==1) ctx.globalAlpha=0.7 + rand*0.2;
            if (g.map[y][x]==3) { // House variations
                if (rand<0.25) y1 = 1; // Red House
                else if (rand<0.50) y1 = 2; // Black house
                else if (rand<0.75) y1 = 3; // Green house
                else {
                    // Block 
                    ctx.drawImage(spriteSheet, 2*bz, 0*bz, bz, bz, x*bz, y*bz, bz, bz);
                    g.scene.add({tag: "block", x: x*g.ui.bz, y: y*g.ui.bz, w: g.ui.bz, h: g.ui.bz})
                    g.map[y][x]=-1 
                    continue; // No house
                }
                // Shadow
                ctx.fillStyle="rgba(70,70,70,0.8)";ctx.fillRect((x+0.8)*bz, (y+0.6)*bz, 0.4*bz, 0.4*bz, )
                g.scene.add(new House({x: x*g.ui.bz, y: y*g.ui.bz}));
            }
            else if (g.map[y][x]==2) { // Grass variations
                if (rand<0.3) y1 = 1; // Tree
                else if (rand<0.5) y1 = 2; // Bush
            }
            else if (g.map[y][x]>=4 && g.map[y][x]<=14) { // Road
                //ctx.drawImage(spriteSheet, 2*bz, 3*bz, bz, bz, x*bz, y*bz, bz, bz);
            }
            else if (g.map[y][x]==15) { // Pizzeria
                g.pizzeria = g.scene.add({tag: "pizzeria", x: x*g.ui.bz, y: y*g.ui.bz, w: g.ui.bz, h: g.ui.bz});
                ctx.drawImage(spriteSheet, 0, 2*bz, bz*2, 2*bz, x*bz, (y-1)*bz, bz*2, bz*2);
                continue;
            }
            else if (g.map[y][x]==17) { // Block
                g.scene.add({tag: "block", x: x*g.ui.bz, y: y*g.ui.bz, w: g.ui.bz, h: g.ui.bz});
                continue;
            }
            ctx.drawImage(spriteSheet, g.map[y][x]*bz, y1*bz*y2, bz, y2*bz, x*bz, y*bz, bz, bz*y2);
        }
}
g.ui.keys = {
	left: g.Keyboard(["KeyA", "ArrowLeft"]) // left arrow
	,right: g.Keyboard(["KeyD", "ArrowRight"]) // right arrow
	,up: g.Keyboard(["KeyW", "ArrowUp"])
	,down: g.Keyboard(["KeyS", "ArrowDown"])
	,fire: g.Keyboard("Space") // space
};
g.ui.keys.left.down = function() {
    if (g.state=="pause") return g.Pause();
    if (g.state!="play") return;
	g.player.move(Vector.left())
};
g.ui.keys.right.down = function() {
    if (g.state=="pause") return g.Pause();
	if (g.state!="play") return;
	g.player.move(Vector.right())
};
g.ui.keys.up.down = function() {
    if (g.state=="pause") return g.Pause();
    if (g.state!="play") return;
	g.player.move(Vector.up())
};
g.ui.keys.down.down = function() {
    if (g.state=="pause") return g.Pause();
    if (g.state!="play") return;
	g.player.move(Vector.down())
};
g.ui.keys.fire.press = function(e) {
	if (g.state=="message") return;
	if (g.state=="title") {return g.title.nextFrame();}
    if (g.state!="play") return g.restart();
    g.manager.vanStops();
};
