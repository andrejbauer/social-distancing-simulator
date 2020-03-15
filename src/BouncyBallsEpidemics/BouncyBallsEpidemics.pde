/* A simple model of epidemics, inspired by a post by Harry Stevens in the Washington Post on March 14, 2020,
   https://www.washingtonpost.com/graphics/2020/world/corona-simulator/
*/

/* Colors of sick, healthy, immune and dead balls. */
color SICK_COLOR = #FF0000;
color HEALTHY_COLOR = #FFFFFF;
color IMMUNE_COLOR = #FFFFA0;
color DEAD_COLOR = #404040;

int totalWidth = 640; /* total width */
int totalHeight = 640; /* total height */

int gapHeight = totalHeight / 16; /* the gap for numbers display */
int barHeight = gapHeight * 3; /* the height of the histogram */

int arenaWidth = totalHeight;
int arenaHeight = totalHeight - gapHeight - barHeight ;

int population = 1000;
float socialDistance = 0.7;
Ball[] balls = new Ball[population];
int sickTime = 100; /* how long a ball is sick */
float mortality = 0.05;

/* status */
int DEAD = -2;
int HEALTHY = -1;
int IMMUNE = 0;
/* positive values are time-to-still-be-sick */

/* statistics */
int timeSlice = 0;
int maxTime = sickTime * 30;
int[] healthyStat = new int[maxTime];
int[] immuneStat = new int[maxTime];
int[] sickStat = new int[maxTime];
int[] deadStat = new int[maxTime];
boolean finished = false;

void computeStats() {
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
  finished = (timeSlice >= maxTime-1) || (si == 0);
  timeSlice++;
}

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

void setup() {
  size(640, 640); /* must be totalWidth, totalHeight */
  for (int i = 0; i < population; i++) {
    balls[i] = new Ball(random(arenaWidth), random(arenaHeight), random(0, 2 * PI), (i <= population * socialDistance), i, balls);
  }
  balls[population-1].status = sickTime;
  noStroke();
  fill(255, 204);
}

void draw() {
  if (!finished) {
  background(0);
  stroke(#808080);
  fill(#000000);
  rect(0, 0, arenaWidth-1, arenaHeight);
  noStroke();
  for (Ball ball : balls) {
    ball.collide();
    ball.move();
  }
  for (Ball b : balls) {
    if (b.isDead()) { b.display(); }
  }
  for (Ball b : balls) {
    if (!b.isDead()) { b.display(); }
  }
  computeStats();
  displayStats();
  }
}

class Ball {  
  boolean fixed;
  int status = HEALTHY ;
  float x, y;
  float diameter;
  float velocity = 1.5 ;
  float direction = 0;
  int id;
  Ball[] others;
 
  Ball(float xin, float yin, float din, boolean fin, int idin, Ball[] oin) {
    x = xin;
    y = yin;
    direction = din;
    diameter = (arenaWidth + arenaHeight) / 150;
    fixed = fin;
    id = idin;
    others = oin;
  } 
  
  boolean isHealthy() { return (status == HEALTHY); }
  boolean isImmune() { return (status == IMMUNE); }
  boolean isDead() { return (status == DEAD); }
  boolean isSick() { return (status > 0) ; }

  /* interact with a ball whose status is s. */
  void contactWith(int s) {
    if (isHealthy() && (s > 0)) { status =  sickTime; }
  }

  color statusColor() {
    if (isHealthy()) { return HEALTHY_COLOR; }
    else if (isImmune()) { return IMMUNE_COLOR; }
    else if (isDead()) { return DEAD_COLOR; }
    else { return SICK_COLOR; }
  }
  
  void collide() {
    if (!isDead()) {
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
        status = (mortality < random(1.0)) ? IMMUNE : DEAD;
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
