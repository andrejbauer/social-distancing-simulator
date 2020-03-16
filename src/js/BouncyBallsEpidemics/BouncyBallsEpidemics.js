/* A simple model of epidemics, inspired by a post by Harry Stevens in the Washington Post on March 14, 2020,
   https://www.washingtonpost.com/graphics/2020/world/corona-simulator/

   Copyright (c) 2020 Andrej Bauer. This work is licenced under the MIT licence.

   **Disclaimer:** this simulation illustrates the qualitative aspects of epidemics only.
   It is *not* a validated model of actual epidemics.
*/

/* Colors of sick, healthy, immune and dead balls. */
let SICK_COLOR = "#FF0000";
let HEALTHY_COLOR = "#FFFFFF";
let IMMUNE_COLOR = "#FFFFA0";
let DEAD_COLOR = "#404040";

/* Display area */
let totalWidth = 320; /* total width */
let totalHeight = 320; /* total height */

/* Division of display area into parts */
let gapHeight = totalHeight >> 4; /* the gap for numbers display */
let barHeight = gapHeight * 3; /* the height of the histogram */
/* The area where the balls are animated */
let arenaWidth = totalHeight;
let arenaHeight = totalHeight - gapHeight - barHeight ;

/* ball status */
let DEAD = -2;
let HEALTHY = -1;
let IMMUNE = 0;
/* positive values are time-to-still-be-sick */

/*********** BALL ************/

function Ball(x, y, direction, stationary, id, model) {
    this.x = x;
    this.y = y;
    this.diameter = (arenaWidth + arenaHeight) / 150 ;
    this.direction = direction;
    this.velocity = 2;
    this.stationary = stationary;
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

    this.move = function() {
        if (this.isSick()) {
            this.status--;
            if (this.status == 0) {
                this.status = (this.model.mortality < random(0.0, 1.0)) ? IMMUNE : DEAD;
            }
        }
        if (!this.stationary && !this.isDead()) {
            this.x = (this.x + this.velocity * cos(this.direction) + arenaWidth) % arenaWidth ;
            this.y = (this.y + this.velocity * sin(this.direction) + arenaHeight) % arenaHeight ;
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
    this.socialDistance = socialDistance; /* proportion of stationary balls */
    this.sickTime = sickTime; /* how long a ball is sick */
    this.maxTime = 30 * sickTime; /* maximum time of simulation */
    this.mortality = mortality; /* how likely an infected ball dies */
    this.population = 1000; /* initial population */

    /* Initialize the balls */
    this.balls = Array(this.population);
    for (let i = 0; i < this.population; i++) {
        this.balls[i] = new Ball(random(arenaWidth), random(arenaHeight), random(0, 2 * PI),
                                 (i <= this.population * this.socialDistance), i, this);
    }
    /* Make one of them sick */
    this.balls[this.population-1].status = this.sickTime;

    /* statistics */
    this.currentTime = 0;
    this.healthyStat = new Array(this.maxTime);
    this.immuneStat = new Array(this.maxTime);
    this.sickStat = new Array(this.maxTime);
    this.deadStat = new Array(this.maxTime);

    this.isFinished = function () {
        return (this.currentTime > 0) && (this.currentTime >= this.maxTime-1 || this.sickStat[this.currentTime-1] == 0);
    };

    /* Perform one step of simulation */
    this.step = function step() {
        if (this.isFinished()) { return; }
        /* update statistics */
        let im = 0;
        let si = 0;
        let de = 0;
        let he = 0;
        for (let i = 0; i < this.population; i++) {
            if (this.balls[i].isImmune()) { im++; }
            else if (this.balls[i].isDead()) { de++; }
            else if (this.balls[i].isSick()) { si++; }
            else { he++; }
        }
        this.immuneStat[this.currentTime] = im;
        this.sickStat[this.currentTime] = si;
        this.deadStat[this.currentTime] = de;
        this.healthyStat[this.currentTime] = he;
        this.currentTime++;

        /* update the balls */
        for (let ball of this.balls) {
            ball.collide();
            ball.move();
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
        text(str(round(100 * this.healthyStat[this.currentTime-1]/this.population)) + "%",
             gapHeight, arenaHeight + 0.7 * gapHeight);
        fill(SICK_COLOR);
        text(str(round(100 * this.sickStat[this.currentTime-1]/this.population)) + "%",
             gapHeight + indentText, arenaHeight + 0.7 * gapHeight);
        fill(IMMUNE_COLOR);
        text(str(round(100 * this.immuneStat[this.currentTime-1]/this.population)) + "%",
             gapHeight + 2*indentText, arenaHeight + 0.7 * gapHeight);
        fill(DEAD_COLOR);
        text(str(round(100 * this.deadStat[this.currentTime-1]/this.population)) + "%",
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
        for (let t = 0; t < this.currentTime; t++) {
            vertex(x0 + t * dx, y1 - this.deadStat[t] * dy);
        }
        endShape(CLOSE);
        /* sick balls */
        fill(SICK_COLOR);
        beginShape();
        for (let t = 0; t < this.currentTime; t++) {
            vertex(x0 + t * dx, y1 - this.deadStat[t] * dy);
        }
        for (let t = this.currentTime-1; t >= 0; t--) {
            vertex(x0 + t* dx, y1 - (this.sickStat[t] + this.deadStat[t]) * dy);
        }
        endShape(CLOSE);
        /* immune balls */
        fill(IMMUNE_COLOR);
        beginShape();
        vertex(x1, y0);
        vertex(x0, y0);
        for (let t = 0; t < this.currentTime; t++) {
            vertex(x0 + t * dx, y0 + this.immuneStat[t] * dy);
        }
        endShape(CLOSE);
    }

}

/********* MAIN SETUP **********/
let model;

function setup() {
    createCanvas(totalWidth, totalHeight);
    model = new Model(0.95, 0.1, 100);
}

function draw() {
    if (!model.isFinished()) {
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
