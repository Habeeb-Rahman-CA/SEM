import { Injectable } from '@nestjs/common';
import { SportEngine } from './sport-engine.interface';
import { FootballEngine } from './football.engine';
import { CricketEngine } from './cricket.engine';
import { BadmintonEngine } from './badminton.engine';
import { VolleyballEngine } from './volleyball.engine';
import { BasketballEngine } from './basketball.engine';
import { AthleticsEngine } from './athletics.engine';
import { TableTennisEngine } from './table-tennis.engine';
import { ChessEngine } from './chess.engine';
import { KabaddiEngine } from './kabaddi.engine';
import { ThrowballEngine } from './throwball.engine';

@Injectable()
export class SportEngineRegistry {
  private readonly engines = new Map<string, SportEngine>();

  constructor() {
    this.register(new FootballEngine());
    this.register(new CricketEngine());
    this.register(new BadmintonEngine());
    this.register(new VolleyballEngine());
    this.register(new BasketballEngine());
    this.register(new AthleticsEngine());
    this.register(new TableTennisEngine());
    this.register(new ChessEngine());
    this.register(new KabaddiEngine());
    this.register(new ThrowballEngine());
  }

  register(engine: SportEngine): void {
    this.engines.set(engine.code, engine);
  }

  getEngine(sportCode: string): SportEngine {
    const engine = this.engines.get(sportCode);
    if (!engine) {
      // Fallback to FootballEngine as default if not found
      return this.engines.get('football')!;
    }
    return engine;
  }
}
