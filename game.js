(function(){

    function Game(wrapperId){
        //Singleton
        if(Game._insance){
            return Game._instance;
        }
        Game._instance = this;

        this.wrapperDivId = wrapperId;
        this.wrapperDiv = null;

        this.layerCanvas = [];
        this.layerCtx = [];

        // array of array to hold objects for each layer
        this.layerObjects = [];

        // update status of each layer
        this.pendingUpdate = [true, true, true, true];

        this.time = 0;

        // scroll amount of screen
        this.scrollX = 0;
        this.freezeScroll = false

        this.player = null;

        // hold ids of all layers animation request
        this.reqAnimFrameId = [];

        this.debug = false;

        this.loadSpritesDef();
    };
    window['Game'] = Game;

    Game.dimensions = {
        WIDTH: 1024,
        HEIGHT: 576,
        MAP_WIDTH: 1024*5,
        MAP_HEIGHT: 576
    };

    Game.scaling = {
        'AIRCRAFT': 1,
        'FENCE': 2,
        'TRACK': 3,
        'PLAYER': 2.4,
        'SKY': 3
    };

    Game.classes = {
        GRAD_CANVAS: 'grad-layer',
        BGROUND_CANVAS: 'bground-layer',
        INTER_CANVAS: 'inter-layer',
        FGROUND_CANVAS: 'fground-layer',
        PLAYER_CANVAS: 'player-layer'
    };

    Game.layers = {
        GRAD: 0,
        BGROUND: 1,
        INTER: 2,
        FGROUND: 3,
        PLAYER: 4
    };

    Game.layersMotionCoeff = {
        GRAD: 0,
        BGROUND: 0.1,
        INTER: 0.4,
        FGROUND: 0.95,
        PLAYER: 1
    };

    Game.config = {
        BGROUND_COLOR_1: '#b06040',
        BGROUND_COLOR_2: '#b06040'
    };

    Game.keyCodes = {
        UP: 38,
        DOWN: 40,
        LEFT: 37,
        RIGHT: 39,
        Q: 81,
        W: 87,
        E: 69,
        SPACE: 32,
        ENTER: 13
    };

    Game.events = {
        KEYUP: 'keyup',
        KEYDOWN: 'keydown',
        LOAD: 'load'
    };

    Game.inputState = {
        UP: 0,
        DOWN: 0,
        LEFT: 0,
        RIGHT: 0,
        Q: 0,
        W: 0,
        E: 0,
        SPACE: 0
    };

    Game.spritesDef = {};

    Game.prototype = {
        init: function(){
            this.wrapperDiv = document.getElementById(this.wrapperDivId);
            if(!this.wrapperDiv) return;

            this.addLayer(Game.classes.GRAD_CANVAS);
            this.addLayer(Game.classes.BGROUND_CANVAS);
            this.addLayer(Game.classes.INTER_CANVAS);
            this.addLayer(Game.classes.FGROUND_CANVAS);
            this.addLayer(Game.classes.PLAYER_CANVAS);

            var objX = 0;
            var obj = null;
            var sprite = null;

            var interOffsetY = 0;
            var playerOffsetX = 0;
            var playerOffsetY = 0;

            // adding gradient in canvas
            obj = new Gradient(this.layerCtx[Game.layers.GRAD],
                                Game.layers.GRAD,
                                Game.config.BGROUND_COLOR_1,
                                Game.config.BGROUND_COLOR_2);
            this.layerObjects[Game.layers.GRAD].push(obj);

            // adding objects in bground
            while(objX < Game.dimensions.MAP_WIDTH){
                sprite = Game.spritesDef.WORLD.SKY;
                obj = new ScreenObject(this.layerCtx[Game.layers.BGROUND],
                                        Game.layers.BGROUND,
                                        sprite,
                                        objX, 0,
                                        Game.scaling.SKY,
                                        Game.layersMotionCoeff.BGROUND);
                this.layerObjects[Game.layers.BGROUND].push(obj);
                objX += sprite.nFrames[0].w * Game.scaling.SKY;
            }

            // adding objects in inter layer
            objX = 0;
            var select = 0;
            interOffsetY =  Game.spritesDef.WORLD.TRACK.nFrames[0].h *
                            Game.scaling.TRACK;
            while(objX < Game.dimensions.MAP_WIDTH){
                var scaling = 1;
                var motionCoeff = Game.layersMotionCoeff.INTER
                if(select == 0){
                    sprite = Game.spritesDef.WORLD.AIRCRAFT;
                    scaling = Game.scaling.AIRCRAFT;
                }
                else{
                    sprite = Game.spritesDef.WORLD.BGROUND;
                    scaling = Game.scaling.AIRCRAFT;
                }

                obj = new ScreenObject(this.layerCtx[Game.layers.INTER],
                                        Game.layers.INTER,
                                        sprite, objX,
                                        Game.dimensions.HEIGHT - interOffsetY
                                        - sprite.nFrames[0].h * scaling,
                                        scaling, motionCoeff);
                this.layerObjects[Game.layers.INTER].push(obj);
                objX += sprite.nFrames[0].w * scaling;
                ++select;
                select %= 2;
            }

            // adding objects in fground
            objX = 0;
            interOffsetY = 0;
            while(objX < Game.dimensions.MAP_WIDTH){
                sprite = Game.spritesDef.WORLD.TRACK;
                obj = new ScreenObject(this.layerCtx[Game.layers.FGROUND],
                                        Game.layers.FGROUND,
                                        sprite,
                                        objX,
                                        Game.dimensions.HEIGHT - interOffsetY
                                        - sprite.nFrames[0].h *
                                          Game.scaling.TRACK,
                                        Game.scaling.TRACK,
                                        Game.layersMotionCoeff.FGROUND);
                this.layerObjects[Game.layers.FGROUND].push(obj);
                objX += sprite.nFrames[0].w * Game.scaling.TRACK;
            }

            objX = 0;
            interOffsetY =  Game.spritesDef.WORLD.TRACK.nFrames[0].h *
                            Game.scaling.TRACK - 20;
            while(objX < Game.dimensions.MAP_WIDTH){
                sprite = Game.spritesDef.WORLD.FENCE;
                obj = new ScreenObject(this.layerCtx[Game.layers.FGROUND],
                                        Game.layers.FGROUND,
                                        sprite,
                                        objX,
                                        Game.dimensions.HEIGHT - interOffsetY
                                        - sprite.nFrames[0].h *
                                          Game.scaling.FENCE,
                                        Game.scaling.FENCE,
                                        Game.layersMotionCoeff.FGROUND);
                this.layerObjects[Game.layers.FGROUND].push(obj);
                objX += sprite.nFrames[0].w * Game.scaling.FENCE;
            }


            // adding objects in player layer

            this.player = new Player(this.layerCtx[Game.layers.PLAYER],
                                    Game.layers.PLAYER,
                                    0 + 50,
                                    Game.dimensions.HEIGHT - 40,
                                    Game.dimensions.HEIGHT - 40,
                                    Game.scaling.PLAYER);
            this.layerObjects[Game.layers.PLAYER].push(this.player);

            this.enemy = new Enemy(this.layerCtx[Game.layers.PLAYER],
                                    Game.layers.PLAYER,
                                    Game.dimensions.WIDTH + 500,
                                    Game.dimensions.HEIGHT - 40,
                                    Game.dimensions.HEIGHT - 40,
                                    Game.scaling.PLAYER);
            this.layerObjects[Game.layers.PLAYER].push(this.enemy);

            this.startListeners()
            this.update();
        },
        createCanvas: function(parentEle, width, height, className){
            var canvas = document.createElement('canvas');
            canvas.className = className;
            canvas.width = width;
            canvas.height = height;
            parentEle.appendChild(canvas);
            return canvas;
        },
        addLayer: function(className){
            var canvas;
            var canvasCtx

            canvas = this.createCanvas(this.wrapperDiv,
                                        Game.dimensions.WIDTH,
                                        Game.dimensions.HEIGHT,
                                        className);
            this.layerCanvas.push(canvas);
            canvasCtx = canvas.getContext('2d');
            canvasCtx.imageSmoothingEnabled = false;
            this.layerCtx.push(canvasCtx);
            this.layerObjects.push([]);
        },
        handleEvent: function(evt){
            return (function(type, events){
                switch(type){
                    case events.KEYUP:
                        this.onKeyUp(evt);
                        break;
                    case events.KEYDOWN:
                        this.onKeyDown(evt);
                        break;
                }
            }.bind(this))(evt.type, Game.events)
        },
        startListeners: function(){
            document.addEventListener(Game.events.KEYDOWN, this);
            document.addEventListener(Game.events.KEYUP, this);
        },
        stopListeners: function(){
            document.removeEventListener(Game.events.KEYDOWN, this);
            document.removeEventListener(Game.events.KEYUP, this);
        },
        loadImages: function(){
            Game.spritesImage = document.getElementById('sprites-image');
            // if image was loaded
            if(Game.spritesImage.complete){
                this.init();
            }
            else{
                Game.spritesImage.addEventListener(Game.events.LOAD,
                this.init.bind(this));
            }
        },
        loadSpritesDef: function(){
            var xmlHttp = new XMLHttpRequest();
            xmlHttp.onreadystatechange = function(){
                if (xmlHttp.readyState == 4 && xmlHttp.status == 200){
                    var rawFrames =
                    JSON.parse(xmlHttp.responseText)['frames'];
                    var spritesDef = {};
                    rawFrames.forEach(function(ele){
                        var meta = ele.filename.split('.')[0].split('/');
                        meta[1] = meta[1].split('_');
                        meta[1].pop();
                        type = meta[1].join('_');
                        orientation = meta[0];
                        if(!spritesDef[type])
                            spritesDef[type] = {};
                        if(!spritesDef[type].nFrames)
                            spritesDef[type].nFrames = [];
                        if(!spritesDef[type].fFrames)
                            spritesDef[type].fFrames = [];

                        if(orientation == 'normal'){
                            spritesDef[type].nFrames.push(ele.frame);
                        }
                        else if(orientation == 'flipped'){
                            spritesDef[type].fFrames.push(ele.frame)
                        }
                    });

                    Game.spritesDef['WORLD'] = {};
                    Game.spritesDef['PLAYER'] = {};
                    Game.spritesDef['ENEMY'] = {};
                    Game.spritesDef['FIREBALL'] = {};

                    // world sprites
                    Game.spritesDef['WORLD']['AIRCRAFT'] = spritesDef['aircraft'];
                    Game.spritesDef['WORLD']['FENCE'] = spritesDef['fence'];
                    Game.spritesDef['WORLD']['WARN_FENCE'] = spritesDef['warn_fence'];
                    Game.spritesDef['WORLD']['LEND_FENCE'] =
                    spritesDef['fence-l-end'];
                    Game.spritesDef['WORLD']['REND_FENCE'] =
                    spritesDef['fence-r-end'];
                    Game.spritesDef['WORLD']['SKY'] = spritesDef['sky'];
                    Game.spritesDef['WORLD']['BGROUND'] = spritesDef['bg'];
                    Game.spritesDef['WORLD']['TRACK'] = spritesDef['track'];

                    // player sprites
                    Game.spritesDef['PLAYER']['IDLE'] = spritesDef['chunli_idle'];
                    Game.spritesDef['PLAYER']['WALK'] = spritesDef['chunli_walk'];
                    Game.spritesDef['PLAYER']['CROUCH'] = spritesDef['chunli_crouch'];
                    Game.spritesDef['PLAYER']['JUMP'] = spritesDef['chunli_jump'];
                    Game.spritesDef['PLAYER']['DIR_JUMP'] =
                    spritesDef['chunli_fw_jump'];
                    Game.spritesDef['PLAYER']['CROUCH_PUNCH'] =
                    spritesDef['chunli_crouch_punch'];
                    Game.spritesDef['PLAYER']['CROUCH_HEAVY_KICK'] =
                    spritesDef['chunli_crouch_heavy_kick'];
                    Game.spritesDef['PLAYER']['HEAVY_PUNCH'] =
                    spritesDef['chunli_heavy_punch'];
                    Game.spritesDef['PLAYER']['MED_KICK'] =
                    spritesDef['chunli_med_kick'];
                    Game.spritesDef['PLAYER']['KIKOUKEN'] =
                    spritesDef['chunli_kikouken'];
                    Game.spritesDef['PLAYER']['CROUCH_HIT'] =
                    spritesDef['chunli_crouch_hit'];
                    Game.spritesDef['PLAYER']['STAND_HIT'] =
                    spritesDef['chunli_hit'];
                    Game.spritesDef['PLAYER']['JUMP_HIT'] =
                    spritesDef['chunli_jump_hit'];

                    // player sprites
                    Game.spritesDef['ENEMY']['IDLE'] = spritesDef['blanka_idle'];
                    Game.spritesDef['ENEMY']['WALK'] = spritesDef['blanka_walk'];
                    Game.spritesDef['ENEMY']['CROUCH'] = spritesDef['blanka_crouch'];
                    Game.spritesDef['ENEMY']['ROLL_ATTACK'] =
                    spritesDef['blanka_roll'];
                    Game.spritesDef['ENEMY']['SHOCK'] =
                    spritesDef['blanka_shock'];
                    Game.spritesDef['ENEMY']['HEAVY_PUNCH'] =
                    spritesDef['blanka_heavy_punch'];
                    Game.spritesDef['ENEMY']['HIT_STUN'] =
                    spritesDef['blanka_heavy_hit'];
                    Game.spritesDef['ENEMY']['KO'] = spritesDef['blanka_ko'];
                    Game.spritesDef['ENEMY']['TAUNT'] = spritesDef['blanka_vic1'];

                    // FireBall sprites
                    Game.spritesDef['FIREBALL']['PROJECTILE'] =
                    spritesDef['chunli_projectile'];
                    Game.spritesDef['FIREBALL']['PROJECTILE_STRIKE'] =
                    spritesDef['chunli_proj_strike'];

                    this.loadImages();
                }
            }.bind(this);
            xmlHttp.open("GET", "assets/kumi.json", true);
            xmlHttp.send();
        },
        loadSounds: function(){
        },
        update: function(){
            var delta = 0;
            var currentTime = performance.now();
            delta = currentTime - (this.time || currentTime);
            this.time = currentTime;

            // Spawn enemy if not present in world
            if(!this.enemy && !this.freezeScroll){
                var spawnX = Math.floor(Game.dimensions.WIDTH / 2 + Math.random() *
                (Game.dimensions.MAP_WIDTH - Game.dimensions.WIDTH / 2));
                this.enemy = new Enemy(this.layerCtx[Game.layers.PLAYER],
                                    Game.layers.PLAYER,
                                    spawnX + this.player.totalScroll,
                                    Game.dimensions.HEIGHT - 40,
                                    Game.dimensions.HEIGHT - 40,
                                    Game.scaling.PLAYER);
                this.layerObjects[Game.layers.PLAYER].push(this.enemy);
            }

            if(this.enemy &&
            this.enemy.blX >= 0 &&
            this.enemy.blX < Game.dimensions.WIDTH){
                this.freezeScroll = true;
            }

            if(this.freezeScroll)
                this.scrollX = 0;

            // Check collisions in player layer
            // Currently frame of object is equivalent to
            // single collision box
            this.handlePlayerLayerCollisions(delta);

            this.updateLayer(Game.layers.GRAD, delta);
            this.updateLayer(Game.layers.BGROUND, delta);
            this.updateLayer(Game.layers.INTER, delta);
            this.updateLayer(Game.layers.FGROUND, delta);
            this.updateLayer(Game.layers.PLAYER, delta);

            this.reqAnimFrameId =
            window.requestAnimationFrame(this.update.bind(this));
        },
        updateLayer: function(index, delta){
            if(!this.pendingUpdate[index]) return;
            this.layerCtx[index].clearRect(0, 0,
                                    Game.dimensions.WIDTH,
                                    Game.dimensions.HEIGHT);
            // removed objects
            this.layerObjects[index] =
            this.layerObjects[index].filter(function(ele){
                return ele.removed == false;
            });
            // repaint each object
            for(var objIndex = 0; objIndex < this.layerObjects[index].length;
                ++objIndex){
                var object = this.layerObjects[index][objIndex];
                object.update(delta);
            }
        },
        handlePlayerLayerCollisions: function(delta){
            // 3 objects to consider: player, projectile and enemy
            var projectileFrame = {};
            var playerFrame = {};
            var enemyFrame = {};

            this.player.getCurrentFrame(playerFrame);
            if(this.enemy)
                this.enemy.getCurrentFrame(enemyFrame);

            // handle projectile and enemy
            if(this.player.projectile && this.enemy){
                this.player.projectile.getCurrentFrame(projectileFrame);
                if(this.checkCollision(projectileFrame, enemyFrame)){
                    if(!this.enemy.handlingHit)
                        this.enemy.handleHit(1);
                    if(!this.player.projectile.handlingHit)
                        this.player.projectile.handleHit();
                }
            }

            // handle player and enemy
            if(this.enemy){
                // check which object has active frame and take action
                // accordingly. Active frame is a frame in which attack will be
                // considered.
                if(this.checkCollision(playerFrame, enemyFrame)){
                    if(playerFrame.active && enemyFrame.active){
                        if(!this.player.handlingHit)
                            this.player.handleHit(1);
                        if(!this.enemy.handlingHit)
                            this.enemy.handleHit(1);
                    }
                    else if(playerFrame.active && !enemyFrame.active){
                        if(!this.enemy.handlingHit)
                            this.enemy.handleHit(1);
                    }
                    else if(!playerFrame.active && enemyFrame.active){
                        if(!this.player.handlingHit)
                            this.player.handleHit(1);
                    }
                    else{
                        if(!this.player.handlingHit)
                            this.player.handleHit(0);
                    }
                }
            }
        },
        checkCollision: function(box1, box2){
            // using axis aligned bounding box method
            var collision = false;

            if(box1.x <= box2.x + box2.w &&
                box1.x + box1.w > box2.x &&
                box1.y <= box2.y + box2.h &&
                box1.y + box1.h > box2.y){
                collision = true;
            }

            return collision;
        },
        onKeyUp: function(evt){
            switch(evt.keyCode){
                case Game.keyCodes.UP:
                    Game.inputState.UP = 0;
                    break;
                case Game.keyCodes.DOWN:
                    Game.inputState.DOWN = 0;
                    break;
                case Game.keyCodes.LEFT:
                    Game.inputState.LEFT = 0;
                    break;
                case Game.keyCodes.RIGHT:
                    Game.inputState.RIGHT = 0;
                    break;
            };
        },
        onKeyDown: function(evt){
            switch(evt.keyCode){
                case Game.keyCodes.UP:
                    Game.inputState.UP = 1;
                    break;
                case Game.keyCodes.DOWN:
                    Game.inputState.DOWN = 1;
                    break;
                case Game.keyCodes.LEFT:
                    Game.inputState.LEFT = 1;
                    break;
                case Game.keyCodes.RIGHT:
                    Game.inputState.RIGHT = 1;
                    break;
                case Game.keyCodes.Q:
                    Game.inputState.Q = 1;
                    break;
                case Game.keyCodes.W:
                    Game.inputState.W = 1;
                    break;
                case Game.keyCodes.E:
                    Game.inputState.E = 1;
                    break;
                case Game.keyCodes.SPACE:
                    Game.inputState.SPACE = 1;
                    break;
                case Game.keyCodes.ENTER:
                    Game.inputState.ENTER = 1;
                    break;
            };
        }
    };

    // Gradient class
    function Gradient(canvasCtx, index, startColor, endColor){
        this.canvasCtx = canvasCtx;
        this.layerIndex = index;

        this.w = Game.dimensions.WIDTH;
        this.h = Game.dimensions.HEIGHT;
        this.gradient = canvasCtx.createLinearGradient(0, 0, 0, this.h);
        this.gradient.addColorStop(0, startColor);
        this.gradient.addColorStop(1, endColor);

        this.removed = false;
    };

    Gradient.prototype = {
        update: function(delta){
            this.draw();

            Game._instance.pendingUpdate[this.layerIndex] = false;
        },
        draw: function(){
            this.canvasCtx.fillStyle = this.gradient;
            this.canvasCtx.fillRect(0, 0, this.w, this.h);
        }
    };

    // Screen Objects class
    function ScreenObject(canvasCtx, layerIndex, spriteData, posX, posY, scale,
                        scrollFactor){
        this.canvasCtx = canvasCtx;
        this.layerIndex = layerIndex;

        // Top left corner coordinates
        this.posX = posX;
        this.posY = posY;

        this.scrollX = 0;
        this.scrollFactor = scrollFactor;

        this.removed = false;

        this.spriteData = spriteData;
        this.scale = scale;
    };

    ScreenObject.prototype = {
        update: function(){
            Game._instance.pendingUpdate[this.layerIndex] = true;

            this.posX += Game._instance.scrollX * this.scrollFactor;

            this.draw();
        },
        draw: function(){
            var frame = this.spriteData.nFrames[0];

            this.canvasCtx.save();

            this.canvasCtx.drawImage(Game.spritesImage,
                                    frame.x, frame.y,
                                    frame.w, frame.h,
                                    this.posX, this.posY,
                                    frame.w * this.scale, frame.h * this.scale);

            this.canvasCtx.restore();
        }
    };

    // Player class
    function Player(canvasCtx, layerIndex, posX, posY, groundY, scale){

        this.canvasCtx = canvasCtx;
        this.removed = false;
        this.layerIndex = layerIndex;

        // bottom-left position of character
        this.blX = posX;
        this.blY = posY;
        this.totalScroll = 0;
        // x where scroll freeze started
        this.xFreeze = 0;

        // averagae width of character based on frames
        this.avgWidth = 50;

        this.scale = scale;

        this.groundYPos = groundY;

        // velocity of character
        this.vx = 0;
        this.vy = 0;

        // currently in which direction player is facing?
        // if towards right then flipped is false, if left then true
        this.flipped = false;

        this.crouch = false;
        this.jumping = false;
        this.endJump = false;

        // Animation
        this.currentAnimData;
        this.currentAnimFrame= 0;
        this.clampCurrentFrame = false;
        this.cycleAnimation = false;
        this.allowAnimCancel = false;

        // fireball projectile
        this.projectile = null;

        this.frameTime = 0;

        this.debug = false;

        this.init();
    };

    Player.config = {
        JUMP_APEX: 300,
        JUMP_DISTANCE: 300,
        JUMP_DURATION: 900,
        WALK_SPEED: 0.2
    };

    Player.prototype = {
        init: function(){
            Player.animations = Game.spritesDef.PLAYER;

            // Crouch animation
            Player.animations.CROUCH.msPerFrame = 1000;
            Player.animations.CROUCH.activeFrames = [];

            // Idle animation
            Player.animations.IDLE.msPerFrame = 1000/4;
            Player.animations.IDLE.activeFrames = [];

            // Walk animation
            Player.animations.WALK.msPerFrame = 1000/8;
            Player.animations.WALK.activeFrames = [];

            // Jump animations
            Player.animations.JUMP.msPerFrame = 1000/8;
            Player.animations.JUMP.activeFrames = [];
            Player.animations.DIR_JUMP.msPerFrame = 1000/8;
            Player.animations.DIR_JUMP.activeFrames = [];

            // Crouch punch animation
            Player.animations.CROUCH_PUNCH.msPerFrame = 1000/8;
            Player.animations.CROUCH_PUNCH.activeFrames = [1];

            // Heavy punch animation
            Player.animations.HEAVY_PUNCH.msPerFrame = 1000/8;
            Player.animations.HEAVY_PUNCH.activeFrames = [1];

            // Medium kick animation
            Player.animations.MED_KICK.msPerFrame = 1000/12;
            Player.animations.MED_KICK.activeFrames = [2];

            // Crouch heavy kick animation
            Player.animations.CROUCH_HEAVY_KICK.msPerFrame = 1000/8;
            Player.animations.CROUCH_HEAVY_KICK.activeFrames = [1];

            // Kikoken animation
            Player.animations.KIKOUKEN.msPerFrame = 1000/12;
            Player.animations.KIKOUKEN.activeFrames = [];

            // Crouch hit stun animation
            Player.animations.CROUCH_HIT.msPerFrame = 1000/8;
            Player.animations.CROUCH_HIT.activeFrames = [];

            // JUMP hit stun animation
            Player.animations.JUMP_HIT.msPerFrame = 1000/8;
            Player.animations.JUMP_HIT.activeFrames = [];

            // Stand hit stun animation
            Player.animations.STAND_HIT.msPerFrame = 1000/8;
            Player.animations.STAND_HIT.activeFrames = [];

            this.setAnimation('IDLE');
            this.cycleAnimation = true;
            this.allowAnimCancel = true;
            this.update(0, {});
        },
        handleInput: function(inputState){
            if(!this.allowAnimCancel){
                return;
            }
            if(!inputState.UP && !inputState.DOWN &&
                !inputState.LEFT && !inputState.RIGHT){
                this.vx = 0;
                this.vy = 0;
                if(this.animation != 'IDLE'){
                    this.setAnimation('IDLE');
                    this.cycleAnimation = true;
                    this.allowAnimCancel = true;
                }
            }

            if(inputState.DOWN){
                this.crouch = true;
            }
            else if(!inputState.DOWN){
                this.crouch = false;
            }

            var moveDirection = 1;
            if(this.flipped) moveDirection = -1;

            if(Game._instance.freezeScroll) moveDirection = 0;

            if(inputState.UP){
                this.jumping = true;
                if(inputState.RIGHT){
                    if(this.animation != 'DIR_JUMP')
                        this.setAnimation('DIR_JUMP');
                        this.jumpXDirection = 1;
                        this.reverseAnimation = false;
                        if(this.flipped)
                            this.reverseAnimation = true;
                    return;
                }
                else if(inputState.LEFT){
                    if(this.animation != 'DIR_JUMP')
                        this.setAnimation('DIR_JUMP');
                        this.jumpXDirection = -1;
                        this.reverseAnimation = false;
                        if(!this.flipped)
                            this.reverseAnimation = true;
                    return;
                }
                if(this.animation != 'JUMP')
                    this.setAnimation('JUMP');
                return;
            }

            // handle kikouken commands
            if(inputState.E){
                this.vx = 0;
                inputState.E = 0;

                if(this.animation != 'KIKOUKEN' && !this.projectile){
                    this.setAnimation('KIKOUKEN');
                }
                return;
            }

            // handle punch commands
            if(inputState.Q){
                this.vx = 0;
                inputState.Q = 0;
                // crouch punch
                if(inputState.DOWN){
                    if(this.animation != 'CROUCH_PUNCH'){
                        this.setAnimation('CROUCH_PUNCH');
                    }
                    return;
                }
                if(this.animation != 'HEAVY_PUNCH'){
                    this.setAnimation('HEAVY_PUNCH');
                }
                return;
            }

            // handle kick commands
            if(inputState.W){
                this.vx = 0;
                inputState.W = 0;
                // crouch punch
                if(inputState.DOWN){
                    if(this.animation != 'CROUCH_HEAVY_KICK'){
                        this.setAnimation('CROUCH_HEAVY_KICK');
                    }
                    return;
                }
                if(this.animation != 'MED_KICK'){
                    this.setAnimation('MED_KICK');
                }
                return;
            }

            if(inputState.DOWN){
                this.vx = 0;
                this.vy = 0;
                if(this.animation != 'CROUCH'){
                    this.setAnimation('CROUCH');
                    this.cycleAnimation = true;
                    this.allowAnimCancel = true;
                }
                if(inputState.RIGHT)
                    this.flipped = false;
                if(inputState.LEFT)
                    this.flipped = true;
                return;
            }

            if(inputState.RIGHT){
                this.vx = Player.config.WALK_SPEED * (moveDirection || 1);
                if(this.flipped) this.flipped = !this.flipped;

                if(this.animation != 'WALK'){
                    this.setAnimation('WALK');
                    this.cycleAnimation = true;
                    this.allowAnimCancel = true;
                    this.reverseAnimation = false;
                    if(this.flipped)
                        this.reverseAnimation = true;
                }
            }
            else if(inputState.LEFT){
                this.vx = Player.config.WALK_SPEED * (moveDirection || -1);
                if(!this.flipped) this.flipped = !this.flipped;

                if(this.animation != 'WALK'){
                    this.cycleAnimation = true;
                    this.setAnimation('WALK');
                    this.allowAnimCancel = true;
                    this.reverseAnimation = false;
                    if(!this.flipped)
                        this.reverseAnimation = true;
                }
            }
        },
        update: function(delta){
            this.frameTime += delta;
            Game._instance.pendingUpdate[this.layerIndex] = true;

            // Change animation state based on input
            if(!this.jumping && !this.handlingHit){
                this.handleInput(Game.inputState);
                this.blX += this.vx * delta;
                this.blY += this.vy * delta;
                if(this.jumping) this.handleJump(delta);
            }
            else if(this.jumping && !this.handlingHit){
                this.handleJump(delta);
            }
            else if(this.handlingHit){
                if(this.currentAnimFrame >= this.frames.length - 1){
                    this.handlingHit = false;
                }
                else if(this.crouch && this.animation != 'CROUCH_HIT'){
                    this.setAnimation('CROUCH_HIT');
                }
                else if(this.jumping && this.animation != 'JUMP_HIT'){
                    this.vx = -this.vx;
                    this.setAnimation('JUMP_HIT');
                }
                else if(!this.crouch &&
                !this.jumping &&
                this.animation != 'STAND_HIT'){
                    this.setAnimation('STAND_HIT');
                }
            }

            var scrollX = -this.vx * delta;
            if(this.blX + this.avgWidth / 2 < Game.dimensions.WIDTH / 2 ||
                this.blX + this.avgWidth / 2 > Game.dimensions.MAP_WIDTH -
                Game.dimensions.WIDTH / 2){
                scrollX = 0;
            }

            if(Game._instance.freezeScroll){
                if(!this.xFreeze)
                    this.xFreeze = this.blX;
                scrollX = 0;
                if(Game._instance.enemy){
                    var enemy = Game._instance.enemy;
                    if(this.blX + this.totalScroll - enemy.blX >= 0){
                        // enemy is on left hand side of player
                        this.flipped = true;
                    }
                    else
                        this.flipped = false;
                }
                else{
                    this.blX = this.xFreeze;
                    this.xFreeze = 0;
                    Game._instance.freezeScroll = false;
                }
            }

            this.totalScroll += scrollX
            Game._instance.scrollX = scrollX;

            if(this.flipped && (this.currentAnimFrame == 0 ||
            this.allowAnimCancel)){
                this.frames = this.currentAnimData.fFrames;
            }
            else if(!this.flipped && (this.currentAnimFrame == 0 ||
            this.allowAnimCancel)){
                this.frames = this.currentAnimData.nFrames;
            }
            var frame = this.frames[this.currentAnimFrame];

            var scaling = this.scale;

            // handle projectile
            if(this.animation == 'KIKOUKEN' &&
                this.currentAnimFrame == this.currentAnimData.nFrames.length - 1){
                // Release projectile
                if(!this.projectile){
                    var projectileStartX = this.flipped ?
                        this.blX + this.totalScroll - this.avgWidth:
                        this.blX + this.totalScroll + this.avgWidth;
                    // 56 pixel measured on final frame from bottom
                    var projectileStartY = this.blY - 56 * scaling;
                    this.projectile = new FireBall(this.canvasCtx,
                                    this.layerIndex,
                                    projectileStartX,
                                    projectileStartY,
                                    scaling);
                    Game._instance.layerObjects[this.layerIndex].push(this.projectile);
                }
            }

            // handling screen sliding freeze
            if(Game._instance.freezeScroll && this.blX + this.totalScroll <= 0){
                this.blX = -this.totalScroll;
            }

            if(Game._instance.freezeScroll &&
            this.blX + this.totalScroll + frame.w * scaling >= Game.dimensions.WIDTH){
                this.blX = Game.dimensions.WIDTH - frame.w * scaling -
                this.totalScroll;
            }

            // handling map edges
            if(this.blX <= 0){
                this.blX = 0;
            }
            if(this.blX + frame.w * scaling >= Game.dimensions.MAP_WIDTH){
                this.blX = Game.dimensions.MAP_WIDTH - frame.w * scaling;
            }

            if(this.frameTime >= this.msPerFrame && !this.clampCurrentFrame){
                this.frameTime = 0;
                if(this.reverseAnimation){
                    this.currentAnimFrame = this.cycleAnimation ?
                    (this.currentAnimFrame - 1) % this.currentAnimData.nFrames.length
                    : this.currentAnimFrame - 1;
                    if(this.currentAnimFrame < 0)
                        this.currentAnimFrame += this.currentAnimData.nFrames.length
                }
                else{
                    this.currentAnimFrame = this.cycleAnimation ?
                    (this.currentAnimFrame + 1) % this.currentAnimData.nFrames.length
                    : this.currentAnimFrame + 1;

                    if(this.currentAnimFrame ==
                    this.currentAnimData.nFrames.length){
                        this.vx = 0;
                        this.vy = 0;
                        this.setAnimation('IDLE');
                        this.cycleAnimation = true;
                        this.allowAnimCancel = true;
                    }
                }
            }

            this.draw(frame);
        },
        draw: function(frame){
            this.canvasCtx.save();

            var scaling = this.scale;

            var drawX = this.blX + this.totalScroll - frame.w;
            var drawY = this.blY - frame.h * scaling;

            // Debug rectangles
            if(this.debug){
                this.canvasCtx.strokeRect(drawX,
                                    drawY,
                                    scaling * frame.w,
                                    scaling * frame.h)
                this.canvasCtx.stroke();
            }

            this.canvasCtx.drawImage(Game.spritesImage,
                //source
                frame.x, frame.y,
                frame.w, frame.h,
                //destination
                drawX,
                drawY,
                scaling * frame.w,
                scaling * frame.h);

            this.canvasCtx.restore();
        },
        handleJump: function(delta){
            // do not rise up in 1st frame
            if(this.currentAnimFrame == 0){
                this.vx = 0;
                this.vy = 0;
            }

            // add velocities in second frame
            if(this.currentAnimFrame > 0 && this.vy == 0 && this.vx == 0){
                this.vy = - 2 * Player.config.JUMP_APEX / Player.config.JUMP_DURATION;
                if(this.animation == 'DIR_JUMP')
                    this.vx = this.jumpXDirection *
                    Player.config.JUMP_DISTANCE / Player.config.JUMP_DURATION;
                this.msPerFrame = Player.config.JUMP_DURATION /
                    (this.currentAnimData.nFrames.length - 1);
            }

            // if reached maxed height start descend
            if(this.groundYPos - this.blY > Player.config.JUMP_APEX
                && this.vy < 0){
                this.vy = -this.vy;
                this.endJump = true;
            }

            // if last frame then clamp current frame till player reaches
            // ground.
            if(this.currentAnimFrame == this.currentAnimData.nFrames.length - 1
            && !this.reverseAnimation){
                this.clampCurrentFrame = true;
            }

            // if reached ground jump will end
            if(this.blY >= this.groundYPos && this.endJump){
                this.setAnimation('IDLE');
                this.cycleAnimation = true;
                this.allowAnimCancel = true;
                this.jumping = false;
                this.endJump = false;
                this.vy = 0;
                this.vx = 0;
                this.blY = this.groundYPos;
                this.clampCurrentFrame = false;
            }

            this.blX += this.vx * delta;
            this.blY += this.vy * delta;
        },
        setAnimation: function(animation){
            this.animation = animation;
            this.currentAnimData =  Player.animations[animation];
            this.currentAnimFrame = 0;
            this.msPerFrame = Player.animations[animation].msPerFrame;
            this.reverseAnimation = false;
            this.cycleAnimation = false;
            this.allowAnimCancel = false;
        },
        getCurrentFrame: function(obj){
            obj.active = false;
            obj.x = this.blX + this.totalScroll - this.frames[this.currentAnimFrame].w;
            obj.y = this.blY - this.frames[this.currentAnimFrame].h * this.scale;
            obj.h = this.frames[this.currentAnimFrame].h * this.scale;
            obj.w = this.frames[this.currentAnimFrame].w * this.scale;

            if(this.currentAnimData.activeFrames.indexOf(this.currentAnimFrame)>=0)
                obj.active = true;
        },
        handleHit: function(damage){
            //this.health -= damage;
            // no stun collision
            if(damage == 0){

            }

            // if in any hit animation don't set to true
            if(this.animation != 'STAND_HIT' &&
            this.animation != 'CROUCH_HIT' &&
            this.animation != 'JUMP_HIT' && damage != 0)
                this.handlingHit = true;
        }
    };

    // FireBall projectile
    function FireBall(canvasCtx, layerIndex, posX, posY, scale){
        this.canvasCtx = canvasCtx;
        this.layerIndex = layerIndex;

        this.blX = posX;
        this.blY = posY;

        this.startX = posX;
        this.startY = posY;

        this.scale = scale;

        this.flipped = false;
        this.animation = '';
        this.animationData;
        this.currentAnimFrame = 0;

        this.handlingHit = false;

        this.vx = 0;

        this.player = Game._instance.player;
        this.removed = false;

        this.frameTime = 0;

        this.debug = false;

        this.init();
    }

    FireBall.config = {
        SPEED: 0.5,
        DISTANCE: 300,
        DAMAGE: 1
    };

    FireBall.animations = {};

    FireBall.prototype = {
        init: function(){
                FireBall.animations = Game.spritesDef['FIREBALL'];

                // Projectile animation
                FireBall.animations.PROJECTILE.msPerFrame = 1000/16;
                FireBall.animations.PROJECTILE.activeFrames =
                [0, 1, 2, 3, 4, 5, 6];

                // Strike animation
                FireBall.animations.PROJECTILE_STRIKE.msPerFrame = 1000/16;
                FireBall.animations.PROJECTILE_STRIKE.activeFrames =
                [];

                this.setAnimation('PROJECTILE');
                this.flipped = this.player.flipped;
                var direction = this.flipped ? -1 : 1;
                this.vx = FireBall.config.SPEED * direction;
        },
        update: function(delta){
            this.frameTime += delta;
            Game._instance.pendingUpdate[this.layerIndex] = true;

            if(this.handlingHit &&
                this.animation != 'PROJECTILE_STRIKE'){
                this.setAnimation('PROJECTILE_STRIKE');
            }

            this.frames = this.animationData.nFrames;
            if(this.flipped)
                this.frames = this.animationData.fFrames;

            this.blX += this.vx * delta;

            if(Math.abs(this.startX - this.blX) > FireBall.config.DISTANCE){
                // finish animation
                this.remove();
            }
            else if(this.animation == 'PROJECTILE_STRIKE' &&
                this.currentAnimFrame == this.frames.length - 1){
                this.remove();
            }
            else{
                this.draw(this.frames[this.currentAnimFrame]);
            }

            if(this.frameTime >= this.animationData.msPerFrame){
                this.currentAnimFrame = (this.currentAnimFrame + 1) %
                this.frames.length;
            }
        },
        draw: function(frame){
            this.canvasCtx.save();

            var drawX = this.flipped ? this.blX - frame.w * this.scale :
                this.blX;
            var drawY = this.blY - 0.5 * frame.h * this.scale;

            this.canvasCtx.drawImage(Game.spritesImage,
                //source
                frame.x, frame.y,
                frame.w, frame.h,
                //destination
                drawX,
                drawY,
                this.scale * frame.w,
                this.scale * frame.h);

            // Debug rectangles
            if(this.debug){
                this.canvasCtx.strokeRect(drawX,
                                        drawY,
                                        this.scale * frame.w,
                                        this.scale * frame.h);
                this.canvasCtx.stroke();
            }

            this.canvasCtx.restore();
        },
        setAnimation: function(animation){
            this.animation = animation;
            this.currentAnimFrame = 0;
            this.animationData = FireBall.animations[animation];
        },
        remove: function(){
                this.removed = true;
                this.player.projectile = null;
        },
        getCurrentFrame: function(obj){
            obj.active = false;
            obj.x = this.flipped ?
                    this.blX - this.frames[this.currentAnimFrame].w * this.scale :
                    this.blX;
            obj.y = this.blY - 0.5 * this.frames[this.currentAnimFrame].h * this.scale
            obj.w = this.frames[this.currentAnimFrame].w * this.scale;
            obj.h = this.frames[this.currentAnimFrame].h * this.scale;

            if(this.animationData.activeFrames.indexOf(this.currentAnimFrame)>=0)
                obj.active = true;
        },
        handleHit: function(){
            this.handlingHit = true;
        }
    };

    function Enemy(canvasCtx, layerIndex, posX, posY, groundY, scale){
        this.canvasCtx = canvasCtx;
        this.layerIndex = layerIndex;

        this.health = 5;

        // bottom left position
        this.blX = posX;
        this.blY = posY;

        this.scale = scale;

        this.avgWidth = 50;

        this.groundYPos = groundY;

        this.vx = 0;
        this.vy = 0;

        // if facing towards right then flipped is false, else true
        this.flipped = false;

        this.currentAnimation = '';
        this.currentAnimData = {};
        this.currentAnimFrame = 0;
        this.cycleAnimation = false;
        this.frames = [];

        this.currentMove = '';
        this.currentMoveTime = 0;

        this.currentState;
        this.stateParams = {};

        this.removed = false;

        // frame time
        this.frameTime = 0;

        // state machine
        this.state = {
            'IDLE': {
                idleDuration: 2000,
                setState: function(obj){
                    obj.currentState = 'IDLE';
                    obj.setAnimation('IDLE');
                    obj.cycleAnimation = true;
                }
            },
            'PATROL': {
                startX: 0,
                patrolDistance: 0,
                patrolMaxDistance: 200,
                walkSpeed: Enemy.config.WALK_SPEED,
                setState: function(obj){
                    obj.currentState = 'PATROL';
                    obj.state.PATROL.startX = obj.blX;
                    obj.vx = obj.state.PATROL.walkSpeed * -1;
                    obj.flipped = true;
                    obj.setAnimation('WALK');
                    obj.cycleAnimation = true;
                }
            },
            'OFFENSE': {
                idle:false,
                engageDistance: 400,
                rangeAttackDistance: 500,
                minPlayerDistance: 50,
                rollSpeed: 0.4,
                rollDistance: 0,
                maxRollDistance: 500,
                idleDuration: 4000,
                setState: function(obj){
                    obj.vx = 0;
                    obj.currentState = 'OFFENSE';
                }
            },
            'DEFENSE': {},
            'DEAD': {
                blinkAmount: 5,
                thrownSpeed: 0.1,
                setState: function(obj){
                    obj.currentState = 'DEAD';
                }
            },
            'SPAWN': {},
            'HIT_STUN': {
                setState: function(obj){
                    obj.vx = 0;
                    obj.currentState = 'HIT_STUN';
                }
            },
            'KNOCKDOWN': {
                setState: function(obj){
                    obj.currentState = 'KNOCKDOWN';
                    obj.setAnimation('KNOCKDOWN');
                    var direction = -1;
                    if(obj.flipped) direction = 1;
                    obj.vx = ENEMY.config.KNOCKDOWN_SPEED * direction;
                }
            }
        };

        this.debug = false;

        this.init();
    };


    Enemy.animations = {};

    // moves with their animations
    Enemy.moves = {
        'STAND': 'IDLE',
        'CROUCH': 'CROUCH',
        'WALK': 'WALK',
        'ROLL_ATTACK': 'ROLL_ATTACK',
        'SHOCK': 'SHOCK',
        'KICK': 'KICK',
        'HEAVY_PUNCH': 'HEAVY_PUNCH',
        'TAUNT': 'TAUNT'
    };

    Enemy.config = {
        JUMP_APEX: 175,
        JUMP_DISTANCE: 200,
        JUMP_DURATION: 900,
        WALK_SPEED: 0.2
    };

    Enemy.prototype = {
        init: function(){
            Enemy.animations = Game.spritesDef.ENEMY;

            // Crouch animation
            Enemy.animations.CROUCH.msPerFrame = 1000;
            Enemy.animations.CROUCH.activeFrames = [];

            // Idle animation
            Enemy.animations.IDLE.msPerFrame = 1000/4;
            Enemy.animations.IDLE.activeFrames = [];

            // Walk animation
            Enemy.animations.WALK.msPerFrame = 1000/8;
            Enemy.animations.WALK.activeeFrame = [];

            // Pikachu animation
            Enemy.animations.SHOCK.msPerFrame = 1000/16;
            Enemy.animations.SHOCK.activeFrames =
            [0, 1, 2, 3, 4, 5, 6, 7];

            // Tackle attack animation
            Enemy.animations.ROLL_ATTACK.msPerFrame = 1000/8;
            Enemy.animations.ROLL_ATTACK.activeFrames =
            [2, 3, 4, 5, 6, 7, 8, 9];

            // Heavy punch animation
            Enemy.animations.HEAVY_PUNCH.msPerFrame = 1000/8;
            Enemy.animations.HEAVY_PUNCH.activeFrames = [2, 3, 4];

            // Taunt animation
            Enemy.animations.TAUNT.msPerFrame = 1000/4;
            Enemy.animations.TAUNT.activeFrames = [];

            // Hit stun animation
            Enemy.animations.HIT_STUN.msPerFrame = 1000/8;
            Enemy.animations.HIT_STUN.activeFrames = [];

            // KO animation
            Enemy.animations.KO.msPerFrame = 1000/8;
            Enemy.animations.KO.activeFrames = [];
            // adding blink like effect in the end
            var lastNFrame =
            Enemy.animations.KO.nFrames[Enemy.animations.KO.nFrames.length - 1];
            var lastFFrame =
            Enemy.animations.KO.fFrames[Enemy.animations.KO.fFrames.length - 1];
            for(var i=0; i<4; ++i){
                Enemy.animations.KO.nFrames.push({x:0, y:0, w:0, h:0});
                Enemy.animations.KO.nFrames.push(lastNFrame);
                Enemy.animations.KO.fFrames.push({x:0, y:0, w:0, h:0});
                Enemy.animations.KO.fFrames.push(lastFFrame);
            }

            this.currentState = 'SPAWN';
        },
        update: function(delta){
            this.frameTime += delta;
            this.currentMoveTime += delta;
            if(!this.currentMove) this.currentMoveTime = 0;

            var player = Game._instance.player;
            var rnd = Math.random();
            var distanceWithPlayer = Math.abs(player.blX + player.totalScroll
                - this.blX);

            var direction = -1;
            if(this.flipped) direction = 1;

            switch(this.currentState){
                case 'SPAWN':
                    this.state.IDLE.setState(this);
                    break;
                case 'IDLE':
                    if(distanceWithPlayer <
                        this.state.OFFENSE.engageDistance){
                        this.state.OFFENSE.setState(this);
                    }
                    if(rnd >= 0.5){
                        this.state.PATROL.setState(this);
                    }
                    break;
                case 'PATROL':
                    if(distanceWithPlayer <
                        this.state.OFFENSE.engageDistance){
                        this.state.OFFENSE.setState(this);
                    }
                    this.state.PATROL.patrolDistance += this.vx * delta;
                    if(Math.abs(this.state.PATROL.patrolDistance) >
                        this.state.PATROL.patrolMaxDistance){
                        this.state.PATROL.patrolDistance = 0;
                        this.vx = -this.vx;
                        this.flipped = !this.flipped;
                    }
                    break;
                case 'OFFENSE':
                    this.flipped = !player.flipped;
                    direction = this.flipped? -1: 1;

                    if(this.health == 0){
                        this.state.KNOCKDOWN.setState(this);
                    }

                    switch(this.currentMove){
                        case 'ROLL_ATTACK':

                            // move only between 2nd and 7th frame
                            // these are rolling frames
                            if(this.currentAnimFrame == 2){
                                this.vx = this.state.OFFENSE.rollSpeed * direction;
                            }
                            else if(this.currentAnimFrame >= 7 &&
                                this.currentAnimFrame < 2){
                                this.vx = 0;
                            }

                            this.state.OFFENSE.rollDistance += Math.abs(this.vx * delta);
                            if(this.state.OFFENSE.rollDistance >
                                this.state.OFFENSE.maxRollDistance){
                                this.state.OFFENSE.rollDistance = 0;
                                this.currentMove = 'STAND';
                                if(this.animation != Enemy.moves.STAND){
                                    this.setAnimation(Enemy.moves.STAND);
                                }
                                this.state.OFFENSE.idle = true;
                            }
                            break;
                        case 'SHOCK':
                            break;
                        case 'WALK':
                            this.vx = Enemy.config.WALK_SPEED * direction;
                            if(distanceWithPlayer <
                                this.state.OFFENSE.minPlayerDistance){
                                this.currentMove = '';
                            }
                            break;
                        case 'STAND':
                            this.vx = 0;
                            if(this.currentMoveTime >
                            this.state.OFFENSE.idleDuration){
                                this.state.OFFENSE.idle = false;
                                this.currentMove = '';
                            }
                            break;
                    };

                    if(this.state.OFFENSE.idle){
                        this.currentMove = 'STAND';
                        break;
                    }

                    if(distanceWithPlayer > this.state.OFFENSE.rangeAttackDistance &&
                        !this.currentMove){
                        this.currentMove = 'ROLL_ATTACK';
                        if(this.animation != Enemy.moves.ROLL_ATTACK){
                            this.setAnimation(Enemy.moves.ROLL_ATTACK);
                            this.msPerFrame =
                            this.state.OFFENSE.maxRollDistance /
                            this.state.OFFENSE.rollSpeed /
                            (this.currentAnimData.nFrames.length - 4);
                        }
                    }
                    else if(!this.currentMove){
                        if(rnd >= 0.8){
                            this.currentMove = 'SHOCK';
                            if(this.animation != Enemy.moves.SHOCK){
                                this.setAnimation(Enemy.moves.SHOCK);
                            }
                        }
                        else if(rnd < 0.8 && rnd >= 0.5){
                            this.currentMove = 'TAUNT';
                            if(this.animation != Enemy.moves.TAUNT){
                                this.setAnimation(Enemy.moves.TAUNT);
                            }
                        }
                        else{
                            this.currentMove = 'STAND';
                            if(this.animation != Enemy.moves.STAND){
                                this.setAnimation(Enemy.moves.STAND);
                                this.cycleAnimation = true;
                            }
                        }

                    }
                    break;
                case 'KNOCKDOWN':
                    this.state.DEAD.setState(this);
                    break;
                case 'HIT_STUN':
                    this.state.HIT_STUN.setState(this);
                    this.currentMove = '';
                    if(this.animation != 'HIT_STUN'){
                        this.setAnimation('HIT_STUN');
                        break;
                    }
                    // if last frame reset hit handling status
                    if(this.currentAnimFrame == this.frames.length - 1 &&
                        this.health != 0){
                        // change to offense state after animation
                        this.state.OFFENSE.setState(this);
                        this.handlingHit = false;
                    }
                    if(this.currentAnimFrame == this.frames.length - 1 &&
                        this.health == 0){
                        this.state.DEAD.setState(this);
                    }
                    break;
                case 'DEAD':
                    // remove if ko animation ended
                    if(this.animation == 'KO' &&
                    this.currentAnimFrame == this.frames.length - 1){
                        this.remove();
                    } else if(this.animation == 'KO' &&
                    this.currentAnimFrame == 4){
                        this.vx = 0;
                    }
                    if(this.animation != 'KO'){
                        this.setAnimation('KO');
                        this.vx = this.state.DEAD.thrownSpeed * direction;
                    }
                    break;
            };

            this.blX += this.vx * delta + Game._instance.scrollX;

            var scaling = this.scale;
            if(this.flipped){
                this.frames = this.currentAnimData.fFrames;
            }
            else{
                this.frames = this.currentAnimData.nFrames;
            }

            var frame = this.frames[this.currentAnimFrame];

            // handling screen scroll freeze
            if(Game._instance.freezeScroll && this.blX <= 0){
                this.blX = 0;
            }

            if(Game._instance.freezeScroll &&
            this.blX + frame.w * scaling >= Game.dimensions.WIDTH){
                this.blX = Game.dimensions.WIDTH - frame.w * scaling;
            }

            this.draw(frame);

            if(this.frameTime >= this.msPerFrame){
                this.frameTime = 0;
                //TODO not a valid check, both if and else are same
                if(this.cycleAnimation){
                    this.currentAnimFrame =
                    (this.currentAnimFrame + 1) % this.currentAnimData.nFrames.length;
                }
                else{
                    this.currentAnimFrame += 1;
                    if(this.currentAnimFrame + 1 >
                    this.currentAnimData.nFrames.length){
                        this.currentMove = '';
                        this.animation = '';
                        this.currentAnimFrame = 0;
                    }
                }
            }
        },
        draw: function(frame){
            var scaling = this.scale;
            var drawX = this.blX;
            var drawY = this.blY - frame.h * scaling;

            this.canvasCtx.save();

            this.canvasCtx.drawImage(Game.spritesImage,
                //source
                frame.x, frame.y,
                frame.w, frame.h,
                //destination
                drawX,
                drawY,
                scaling * frame.w,
                scaling * frame.h);

            // Debug rectangles
            if(this.debug){
                this.canvasCtx.strokeRect(drawX,
                                        drawY,
                                        this.scale * frame.w,
                                        this.scale * frame.h);
                this.canvasCtx.stroke();
            }

            this.canvasCtx.restore();
        },
        setAnimation: function(animation){
            this.animation = animation;
            this.currentAnimData = Enemy.animations[animation];
            this.currentAnimFrame = 0;
            this.msPerFrame = Enemy.animations[animation].msPerFrame;
            this.cycleAnimation = false;
        },
        getCurrentFrame: function(obj){
            if(this.frames.length == 0){
                obj = null;
                return;
            }

            obj.active = false;
            obj.x = this.blX;
            obj.y = this.blY - this.frames[this.currentAnimFrame].h *
            this.scale;
            obj.w = this.frames[this.currentAnimFrame].w * this.scale;
            obj.h = this.frames[this.currentAnimFrame].h * this.scale;

            if(this.currentAnimData.activeFrames &&
            this.currentAnimData.activeFrames.indexOf(this.currentAnimFrame)>=0)
                obj.active = true;
        },
        remove: function(){
            this.removed = true;
            Game._instance.enemy = null;
        },
        handleHit: function(damage){
            this.handlingHit = true;
            this.health -= damage;
            this.currentState = 'HIT_STUN'
        }
    };
})();

function onDocumentLoad(){
    new Game('game-wrapper');
};

document.addEventListener('DOMContentLoaded', onDocumentLoad);
