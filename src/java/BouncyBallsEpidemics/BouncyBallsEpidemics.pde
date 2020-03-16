/* A simple model of epidemics, inspired by a post by Harry Stevens in the Washington Post on March 14, 2020,
   https://www.washingtonpost.com/graphics/2020/world/corona-simulator/

   Copyright (c) 2020 Andrej Bauer. This work is licenced under the MIT licence.
*/

/* Colors of sick, healthy, immune and dead balls. */
color SICK_COLOR = #FF0000;
color HEALTHY_COLOR = #FFFFFF;
color IMMUNE_COLOR = #FFFFA0;
color DEAD_COLOR = #404040;

/* Display area */
int totalWidth = 640; /* total width */
int totalHeight = 640; /* total height */

/* Division of display area into parts */
int gapHeight = totalHeight / 16; /* the gap for numbers display */
int barHeight = gapHeight * 3; /* the height of the histogram */
/* The area where the balls are animated */
int arenaWidth = totalHeight;
int arenaHeight = totalHeight - gapHeight - barHeight ;

/* ball status */
int DEAD = -2;
int HEALTHY = -1;
int IMMUNE = 0;
/* positive values are time-to-still-be-sick */

/*********** MODEL ************/

class Model {
  float socialDistance = 0.7;
  int sickTime = 100; /* how long a ball is sick */
  float mortality = 0.05;
 
  int population = 1000;
  Ball[] balls;

  /* statistics */
  int timeSlice = 0;
  int maxTime;
  int[] healthyStat;
  int[] immuneStat;
  int[] sickStat;
  int[] deadStat;
  
  Model(float socialDistance, float mortality, int sickTime) {
    this.socialDistance = socialDistance;
    this.mortality = mortality;
    this.sickTime = sickTime;
    this.maxTime = sickTime * 30;

    /* Initialize the statistics */
    healthyStat = new int[maxTime];
    immuneStat = new int[maxTime];
    sickStat = new int[maxTime];
    deadStat = new int[maxTime];

    /* Initialize the balls */
    balls = new Ball[population]; 
    for (int i = 0; i < population; i++) {
      balls[i] = new Ball(random(arenaWidth), random(arenaHeight), random(0, 2 * PI),
                          (i <= population * socialDistance), i, this);
    }
    /* Make one of them sick */
    balls[population-1].status = sickTime;
  }

  /* Perform one step of simulation */
  void step() {
    if (!isFinished()) {
      /* update statistics */
      int im = 0;
      int si = 0;
      int de = 0;
      int he = 0;
      for (int i = 0; i < population; i++) {
        if (balls[i].isImmune()) { im++; }
        else if (balls[i].isDead()) { de++; }
        else if (balls[i].isSick()) { si++; }
        else { he++; }
      }
      immuneStat[timeSlice] = im;
      sickStat[timeSlice] = si;
      deadStat[timeSlice] = de;
      healthyStat[timeSlice] = he;
      
      timeSlice++;

      /* update the balls */
      for (Ball ball : balls) {
        ball.collide();
        ball.move();
      }
    }
  }

  boolean isFinished() {
    return (timeSlice > 0) && (timeSlice >= maxTime-1 || sickStat[timeSlice-1] == 0); }

  void displayStats() {
    float x0 = 0.0 ;
    float x1 = min(timeSlice, arenaWidth);
    float dx = (x1 - x0) / timeSlice; 
    float y0 = arenaHeight + gapHeight;
    float y1 = y0 + barHeight;
    float dy = (y1 - y0) / population;
    /* numbers */
    int indentText = arenaWidth / 8 ;
    textSize(gapHeight * 0.6);
    fill(HEALTHY_COLOR);
    text(str(round(100*healthyStat[timeSlice-1]/population)) + "%", gapHeight, arenaHeight + 0.7 * gapHeight);  
    fill(SICK_COLOR);
    text(str(round(100*sickStat[timeSlice-1]/population)) + "%", gapHeight + indentText, arenaHeight + 0.7 * gapHeight);
    fill(IMMUNE_COLOR);
    text(str(round(100*immuneStat[timeSlice-1]/population)) + "%", gapHeight + 2*indentText, arenaHeight + 0.7 * gapHeight);
    fill(DEAD_COLOR);
    text(str(round(100*deadStat[timeSlice-1]/population)) + "%", gapHeight + 3*indentText, arenaHeight + 0.7 * gapHeight);
    
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
    for (int t = 0; t < timeSlice; t++) {
      vertex(x0 + t * dx, y1 - deadStat[t] * dy);
    }
    endShape(CLOSE);
    /* sick balls */
    fill(SICK_COLOR);
    beginShape();
    for (int t = 0; t < timeSlice; t++) {
      vertex(x0 + t * dx, y1 - deadStat[t] * dy);
    }
    for (int t = timeSlice-1; t >= 0; t--) {
      vertex(x0 + t* dx, y1 - (sickStat[t] + deadStat[t]) * dy);
    }
    endShape(CLOSE);
    /* immune balls */
    fill(IMMUNE_COLOR);
    beginShape();
    vertex(x1, y0);
    vertex(x0, y0);
    for (int t = 0; t < timeSlice; t++) {
      vertex(x0 + t * dx, y0 + immuneStat[t] * dy);
    }
    endShape(CLOSE);
  }

} /* class Model */

/*************** BALLS ******************/

class Ball {  
  boolean fixed;
  int status = HEALTHY ;
  float x, y;
  float diameter;
  float velocity = 1.5 ;
  float direction = 0;
  int id;
  Model model;
 
  Ball(float x, float y, float direction, boolean fixed, int id, Model model) {
    this.x = x;
    this.y = y;
    this.direction = direction;
    diameter = (arenaWidth + arenaHeight) / 150;
    this.fixed = fixed;
    this.id = id;
    this.model = model;
  } 
  
  boolean isHealthy() { return (status == HEALTHY); }
  boolean isImmune() { return (status == IMMUNE); }
  boolean isDead() { return (status == DEAD); }
  boolean isSick() { return (status > 0) ; }

  /* interact with a ball whose status is s. */
  void contactWith(int s) {
    if (isHealthy() && (s > 0)) { status =  model.sickTime; }
  }

  color statusColor() {
    if (isHealthy()) { return HEALTHY_COLOR; }
    else if (isImmune()) { return IMMUNE_COLOR; }
    else if (isDead()) { return DEAD_COLOR; }
    else { return SICK_COLOR; }
  }
  
  void collide() {
    if (!isDead()) {
      Ball[] others = model.balls;
      for (int i = 0; i < id; i++) {
        if (others[i].isDead()) { continue; }
        float dx = others[i].x - x;
        float dy = others[i].y - y;
        float distance2 = dx*dx + dy*dy;
        if (distance2 < diameter * diameter) {
          int s = status;
          contactWith(others[i].status);
          others[i].contactWith(s);
          direction = random(0, 2 * PI);
          others[i].direction = random(0, 2 * PI);
        }
      }
    }
  }
  
  void move() {
    if (isSick()) {
      status--;
      if (status == 0) {
        status = (model.mortality < random(1.0)) ? IMMUNE : DEAD;
      }
    }
    if (!fixed && !isDead()) {
      x = (x + velocity * cos(direction) + arenaWidth) % arenaWidth ;
      y = (y + velocity * sin(direction) + arenaHeight) % arenaHeight ;
    }
  }
  
  void display() {
    fill(statusColor());
    ellipse(x, y, diameter, diameter);
  }
}

/**** MAIN PROGRAM ****/
Model model = new Model(0.0, 0.75, 100);

void setup() {
  size(640, 640); /* must be totalWidth, totalHeight */
}

void draw() {
  if (!model.isFinished()) {
    background(#000000);
    /* arena */
    noStroke();
    fill(#000000);
    rect(0, 0, arenaWidth-1, arenaHeight);
    /* dead balls first */
    for (Ball b : model.balls) {
      if (b.isDead()) { b.display(); }
    }
    /* live balls */
    for (Ball b : model.balls) {
      if (!b.isDead()) { b.display(); }
    }
    model.step();
    model.displayStats();
  }
}
