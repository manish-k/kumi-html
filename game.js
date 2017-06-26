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

        this.loadSpritesDef();

    };
    window['Game'] = Game;

    Game.dimensions = {
        WIDTH: 1024,
        HEIGHT: 576,
        MAP_WIDTH: 800*5,
        MAP_HEIGHT: 600
    };

    Game.scaling = {
        'AIRCRAFT': 3,
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
        INTER: 0.8,
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
                                    0 + 10,
                                    Game.dimensions.HEIGHT - 40,
                                    Game.dimensions.HEIGHT - 40,
                                    Game.scaling.PLAYER);
            this.player.setAnimation('IDLE');
            this.layerObjects[Game.layers.PLAYER].push(this.player);

            this.enemy = new Enemy(this.layerCtx[Game.layers.PLAYER],
                                    Game.layers.PLAYER,
                                    Game.dimensions.WIDTH - 100,
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
                    Game.spritesDef['PLAYER']['DIR_JUMP'] = spritesDef['chunli_fw_jump'];

                    // player sprites
                    Game.spritesDef['ENEMY']['IDLE'] = spritesDef['blanka_idle'];
                    Game.spritesDef['ENEMY']['WALK'] = spritesDef['blanka_walk'];
                    Game.spritesDef['ENEMY']['CROUCH'] = spritesDef['blanka_crouch'];
                    Game.spritesDef['ENEMY']['ROLL_ATTACK'] = spritesDef['blanka_roll'];
                    Game.spritesDef['ENEMY']['SHOCK'] = spritesDef['blanka_shock'];
                    Game.spritesDef['ENEMY']['HEAVY_PUNCH'] = spritesDef['blanka_heavy_punch'];
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

            this.freezeScroll = true;
            if(this.freezeScroll)
                this.scrollX = 0;

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
            // repaint each object
            for(var objIndex = 0; objIndex < this.layerObjects[index].length;
                ++objIndex){
                var object = this.layerObjects[index][objIndex];
                if(object.removed){
                    this.layerObjects[index].splice(objIndex, 1);
                }
                object.update(delta);
            }
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

        this.jumping = false;
        this.endJump = false;

        // Animation
        this.currentAnimData;
        this.currentAnimFrame= 0;
        this.clampCurrentFrame = false;

        // frame time
        this.frameTime = 0;

        this.init();
    };

    Player.config = {
        JUMP_APEX: 200,
        JUMP_DISTANCE: 300,
        JUMP_DURATION: 900,
        WALK_SPEED: 0.2
    };

    Player.prototype = {
        init: function(){
            Player.animations = Game.spritesDef.PLAYER;
            Player.animations.CROUCH.msPerFrame = 1000;
            Player.animations.IDLE.msPerFrame = 1000/4;
            Player.animations.WALK.msPerFrame = 1000/8;
            Player.animations.JUMP.msPerFrame = 1000/8;
            Player.animations.DIR_JUMP.msPerFrame = 1000/8;

            this.setAnimation('IDLE');
            this.update(0, {});
        },
        handleInput: function(inputState){
            if(!inputState.UP && !inputState.DOWN &&
                !inputState.LEFT && !inputState.RIGHT){
                this.vx = 0;
                this.vy = 0;
                if(this.animation != 'IDLE')
                    this.setAnimation('IDLE');
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

            if(inputState.DOWN){
                this.vx = 0;
                this.vy = 0;
                if(this.animation != 'CROUCH')
                    this.setAnimation('CROUCH');
                if(inputState.RIGHT)
                    this.flipped = false;
                if(inputState.LEFT)
                    this.flipped = true;
                return;
            }

            if(inputState.RIGHT){
                this.vx = Player.config.WALK_SPEED * (moveDirection || 1);
                if(this.flipped) this.flipped = !this.flipped;

                if(this.animation != 'WALK')
                    this.setAnimation('WALK');
            }
            else if(inputState.LEFT){
                this.vx = Player.config.WALK_SPEED * (moveDirection || -1);
                if(!this.flipped) this.flipped = !this.flipped;

                if(this.animation != 'WALK')
                    this.setAnimation('WALK');
            }
        },
        update: function(delta){
            this.frameTime += delta;
            Game._instance.pendingUpdate[this.layerIndex] = true;

            // Change animation state based on input
            if(!this.jumping){
                this.handleInput(Game.inputState);
                this.blX += this.vx * delta;
                this.blY += this.vy * delta;
                if(this.jumping) this.handleJump(delta);
            }
            else
                this.handleJump(delta);

            var scrollX = -this.vx * delta;
            if(this.blX + this.avgWidth / 2 < Game.dimensions.WIDTH / 2 ||
                this.blX + this.avgWidth / 2 > Game.dimensions.MAP_WIDTH -
                Game.dimensions.WIDTH / 2){
                scrollX = 0;
            }


            if(Game._instance.freezeScroll){
                scrollX = 0;
                var enemy = Game._instance.enemy;
                if(this.blX + this.totalScroll - enemy.blX >= 0){
                    // enemy is on left hand side of player
                    this.flipped = true;
                }
                else
                    this.flipped = false;
            }

            this.totalScroll += scrollX
            Game._instance.scrollX = scrollX;

            if(this.frameTime >= this.msPerFrame && !this.clampCurrentFrame){
                this.frameTime = 0;
                if(this.reverseAnimation){
                    this.currentAnimFrame =
                    (this.currentAnimFrame - 1) % this.currentAnimData.nFrames.length;
                    if(this.currentAnimFrame < 0)
                        this.currentAnimFrame += this.currentAnimData.nFrames.length
                }
                else{
                    this.currentAnimFrame =
                    (this.currentAnimFrame + 1) % this.currentAnimData.nFrames.length;
                }
            }

            var frame;
            if(this.flipped){
                frame = this.currentAnimData.fFrames[this.currentAnimFrame];
            }
            else{
                frame = this.currentAnimData.nFrames[this.currentAnimFrame];
            }

            var scaling = this.scale;

            // handling screen sliding freeze
            if(Game._instance.freezeScroll && this.blX + this.totalScroll <= 0){
                this.blX = 0;
            }

            if(Game._instance.freezeScroll &&
            this.blX + this.totalScroll + frame.w * scaling >= Game.dimensions.WIDTH){
                this.blX = Game.dimensions.WIDTH - frame.w * scaling;
            }

            // handling map edges
            if(this.blX <= 0){
                this.blX = 0;
            }
            if(this.blX + frame.w * scaling >= Game.dimensions.MAP_WIDTH){
                this.blX = Game.dimensions.MAP_WIDTH - frame.w * scaling;
            }

            this.draw(frame);
        },
        draw: function(frame){
            this.canvasCtx.save();

            var scaling = this.scale;

            this.canvasCtx.drawImage(Game.spritesImage,
                //source
                frame.x, frame.y,
                frame.w, frame.h,
                //destination
                this.blX + this.totalScroll, this.blY - frame.h * scaling,
                scaling * frame.w, scaling * frame.h);

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
                this.jumping = false;
                this.endJump = false;
                this.vy = 0;
                this.vx = 0;
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
        this.currentAnimData;
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
                rangeAttackDistance: 400,
                minPlayerDistance: 50,
                rollSpeed: 0.4,
                rollDistance: 0,
                maxRollDistance: 500,
                idleDuration: 1000,
                setState: function(obj){
                    obj.vx = 0;
                    obj.currentState = 'OFFENSE';
                }
            },
            'DEFENSE': {},
            'DEAD': {
                blinkAmount: 5,
                setState: function(obj){
                    obj.currentState = 'DEAD';
                }
            },
            'SPAWN': {},
            'STUNNED': {},
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
            Enemy.animations.CROUCH.msPerFrame = 1000;
            Enemy.animations.IDLE.msPerFrame = 1000/4;
            Enemy.animations.WALK.msPerFrame = 1000/8;
            Enemy.animations.SHOCK.msPerFrame = 1000/12;
            Enemy.animations.ROLL_ATTACK.msPerFrame = 1000/8;
            Enemy.animations.HEAVY_PUNCH.msPerFrame = 1000/8;
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
                        if(rnd >= 0.5){
                            this.currentMove = 'SHOCK';
                            if(this.animation != Enemy.moves.SHOCK){
                                this.setAnimation(Enemy.moves.SHOCK);
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
                case 'DEAD':
                    this.removed = true;
            };

            this.blX += this.vx * delta + Game._instance.scrollX;
            if(this.frameTime >= this.msPerFrame){
                this.frameTime = 0;
                if(this.cycleAnimation){
                    this.currentAnimFrame =
                    (this.currentAnimFrame + 1) % this.currentAnimData.nFrames.length;
                }
                else{
                    this.currentAnimFrame += 1;
                    if(this.currentAnimFrame + 1 >
                    this.currentAnimData.nFrames.length){
                        this.currentMove = '';
                        this.currentAnimFrame = 0;
                    }
                }
            }

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
        },
        draw: function(frame){

            var scaling = this.scale;

            this.canvasCtx.save();

            this.canvasCtx.drawImage(Game.spritesImage,
                //source
                frame.x, frame.y,
                frame.w, frame.h,
                //destination
                this.blX, this.blY - frame.h * scaling,
                scaling * frame.w, scaling * frame.h);

            this.canvasCtx.restore();

        },
        setAnimation: function(animation){
            this.animation = animation;
            this.currentAnimData = Enemy.animations[animation];
            this.currentAnimFrame = 0;
            this.msPerFrame = Enemy.animations[animation].msPerFrame;
            this.cycleAnimation = false;
        }
    };
})();

function onDocumentLoad(){
    new Game('game-wrapper');
};

document.addEventListener('DOMContentLoaded', onDocumentLoad);
