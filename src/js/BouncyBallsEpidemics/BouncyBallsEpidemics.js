/* A simple model of epidemics, inspired by a post by Harry Stevens in the Washington Post on March 14, 2020,
   https://www.washingtonpost.com/graphics/2020/world/corona-simulator/

   Copyright (c) 2020 Andrej Bauer. This work is licenced under the MIT licence.

   DISCLAIMER: this simulation illustrates the qualitative mathematical aspects of epidemics for illustration purposes only.
   It is *not* a validated model of actual epidemics and no conclusions should be drawn from it regarding health policy.
*/

/* Colors of sick, healthy, immune and dead balls. */
let SICK_COLOR = "#FF0000";
let HEALTHY_COLOR = "#FFFFFF";
let IMMUNE_COLOR = "#FFFFA0";
let DEAD_COLOR = "#808080";

/* Display area */
let totalWidth = 320; /* total width */
let totalHeight = 480; /* total height */

/* Division of display area into parts */
let gapHeight = totalHeight >> 4; /* the gap for numbers display */
let barHeight = gapHeight * 3; /* the height of the histogram */
/* The area where the balls are animated */
let arenaWidth = totalHeight;
let arenaHeight = totalHeight - gapHeight - barHeight ;

/* GUI elements */
let socialDistanceSlider = undefined ;
let socialDistanceValue = undefined ;
let mortalitySlider = undefined ;
let mortalityValue = undefined ;
let sickTimeSlider = undefined ;
let sickTimeValue = undefined ;
let restartButton = undefined ;

/* ball status */
let DEAD = -2;
let HEALTHY = -1;
let IMMUNE = 0;
/* positive values are time-to-still-be-sick */


/*********** BALL ************/

function Ball(x, y, direction, id, model) {
    this.x = x;
    this.y = y;
    this.diameter = (arenaWidth + arenaHeight) / 200 ;
    this.direction = direction;
    this.stationary = false;
    this.id = id;
    this.model = model;
    this.status = HEALTHY;

    this.isHealthy = function () { return (this.status == HEALTHY); };
    this.isImmune = function () { return (this.status == IMMUNE); };
    this.isDead = function () { return (this.status == DEAD); };
    this.isSick = function () { return (this.status > 0) ; };

    /* interact with a ball whose status is s. */
    this.contactWith = function (s) {
        if (this.isHealthy() && (s > 0)) {
            this.status = this.model.sickTime;
        }
    }

    this.statusColor = function () {
        if (this.isHealthy()) { return HEALTHY_COLOR; }
        else if (this.isImmune()) { return IMMUNE_COLOR; }
        else if (this.isDead()) { return DEAD_COLOR; }
        else { return SICK_COLOR; }
    }

    this.step = function() {
        if (this.isSick()) {
            this.status--;
            if (this.status == 0) {
                this.status = (this.model.mortality < random(0.0, 1.0)) ? IMMUNE : DEAD;
            }
        }
        if (!this.stationary && !this.isDead()) {
            this.x = (this.x + this.model.velocity() * cos(this.direction) + arenaWidth) % arenaWidth ;
            this.y = (this.y + this.model.velocity() * sin(this.direction) + arenaHeight) % arenaHeight ;
        }
    }

    this.collide = function () {
        if (this.isDead()) { return; }
        let others = this.model.balls;
        for (let i = 0; i < id; i++) {
            if (others[i].isDead()) { continue; }
            let dx = others[i].x - this.x;
            let dy = others[i].y - this.y;
            let distance2 = dx*dx + dy*dy;
            if (distance2 < this.diameter * this.diameter) {
                let s = this.status;
                this.contactWith(others[i].status);
                others[i].contactWith(s);
                this.direction = random(0, 2 * PI);
                others[i].direction = random(0, 2 * PI);
            }
        }
    }


    this.display = function () {
        fill(this.statusColor());
        ellipse(this.x, this.y, this.diameter, this.diameter);
    }
}


/*********** MODEL ************/

function Model(socialDistance, mortality, sickTime) {
    this.initialize = function(socialDistance, mortality, sickTime) {
        this.socialDistance = socialDistance; /* proportion of stationary balls */
        this.sickTime = sickTime; /* how long a ball is sick */
        this.maxTime = 100 * sickTime; /* maximum time of simulation */
        this.mortality = mortality; /* how likely an infected ball dies */
        this.population = 1000; /* initial population */

        /* statistics */
        this.currentTime = 0;
        this.healthyStat = [this.population-1];
        this.immuneStat = [0];
        this.sickStat = [1];
        this.deadStat = [0];

        /* Initialize the balls */
        this.balls = [];
        for (let i = 0; i < this.population; i++) {
            this.balls.push(new Ball(random(arenaWidth), random(arenaHeight), random(0, 2 * PI), i, this));
        }
        /* Make one of them sick */
        this.balls[0].contactWith(this.sickTime);

    }

    this.isFinished = function () {
        return (this.currentTime > 0) && (this.currentTime >= this.maxTime-1 || this.sickStat[this.sickStat.length-1] == 0);
    };

    /* The velocity of balls, depending on social distance. */
   this.velocity = function () {
       let velocity = (arenaWidth + arenaHeight) * (1 - this.socialDistance) / 100 ;
       return velocity;
   }

    /* Perform one step of simulation */
    this.step = function step() {
        if (this.isFinished()) { return; }
        /* update statistics */
        let im = 0;
        let si = 0;
        let de = 0;
        let he = 0;
        for (let b of this.balls) {
            if (b.isImmune()) { im++; }
            else if (b.isDead()) { de++; }
            else if (b.isSick()) { si++; }
            else { he++; }
        }
        this.immuneStat.push(im);
        this.sickStat.push(si);
        this.deadStat.push(de);
        this.healthyStat.push(he);
        this.currentTime++;

        /* update the balls */
        for (let ball of this.balls) {
            ball.collide();
            ball.step();
        }
    }

    this.displayStats = function() {
        let x0 = 0.0 ;
        let x1 = min(this.currentTime, arenaWidth);
        let dx = (x1 - x0) / this.currentTime;
        let y0 = arenaHeight + gapHeight;
        let y1 = y0 + barHeight;
        let dy = (y1 - y0) / this.population;
        /* numbers */
        let indentText = arenaWidth / 8 ;
        textSize(gapHeight * 0.6);
        fill(HEALTHY_COLOR);
        text(str(round(100 * this.healthyStat[this.healthyStat.length-1]/this.population)) + "%",
             gapHeight, arenaHeight + 0.7 * gapHeight);
        fill(SICK_COLOR);
        text(str(round(100 * this.sickStat[this.sickStat.length-1]/this.population)) + "%",
             gapHeight + indentText, arenaHeight + 0.7 * gapHeight);
        fill(IMMUNE_COLOR);
        text(str(round(100 * this.immuneStat[this.immuneStat.length-1]/this.population)) + "%",
             gapHeight + 2*indentText, arenaHeight + 0.7 * gapHeight);
        fill(DEAD_COLOR);
        text(str(round(100 * this.deadStat[this.deadStat.length-1]/this.population)) + "%",
             gapHeight + 3*indentText, arenaHeight + 0.7 * gapHeight);

        /* the bars */
        noStroke();
        /* healthy balls */
        fill(HEALTHY_COLOR);
        rect(x0, y0, x1 - x0, barHeight);
        /* dead balls */
        fill(DEAD_COLOR);
        beginShape();
        vertex(x1, y1);
        vertex(x0, y1);
        for (let t = 0; t < this.deadStat.length; t++) {
            vertex(x0 + t * dx, y1 - this.deadStat[t] * dy);
        }
        endShape(CLOSE);
        /* sick balls */
        fill(SICK_COLOR);
        beginShape();
        for (let t = 0; t < this.deadStat.length; t++) {
            vertex(x0 + t * dx, y1 - this.deadStat[t] * dy);
        }
        for (let t = this.sickStat.length; t >= 0; t--) {
            vertex(x0 + t* dx, y1 - (this.sickStat[t] + this.deadStat[t]) * dy);
        }
        endShape(CLOSE);
        /* immune balls */
        fill(IMMUNE_COLOR);
        beginShape();
        vertex(x1, y0);
        vertex(x0, y0);
        for (let t = 0; t < this.immuneStat.length; t++) {
            vertex(x0 + t * dx, y0 + this.immuneStat[t] * dy);
        }
        endShape(CLOSE);
    };

    this.initialize(socialDistance, mortality, sickTime);
}

/********* MAIN SETUP **********/
let model;

function getSocialDistance() {
    return socialDistanceSlider.value() / 100.0 ;
}

function restartModel() {
    model.initialize(getSocialDistance(), 0.1, 50);
}

function setup() {
    socialDistanceSlider = select('#social-distance-slider');
    socialDistanceValue = select('#social-distance-value');
    restartButton = select('#restart-button');

    let cnv = createCanvas(totalWidth, totalHeight);
    cnv.parent('ball-epidemics');

    model = new Model(0.5, 0.1, 50);

    frameRate(30);
    ellipseMode(CENTER);

    restartButton.mousePressed(restartModel);
}

function draw() {
    if (model.isFinished()) {
        noLoop();
    } else {
        let sd = socialDistanceSlider.value() / 100.0;
        if (model.socialDistance != sd) {
            socialDistanceValue.html(str(sd));
            model.socialDistance = sd;
        }

        background("#000000");
        /* arena */
        noStroke();
        /* dead balls first */
        for (let b of model.balls) {
            if (b.isDead()) { b.display(); }
        }
        /* live balls */
        for (let b of model.balls) {
            if (!b.isDead()) { b.display(); }
        }
        model.step();
        model.displayStats();
    }
}
