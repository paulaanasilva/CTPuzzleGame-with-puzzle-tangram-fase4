import { Scene } from "phaser";
import CodeEditor from "../controls/CodeEditor";
import { MecanicaRope } from "../ct-platform-classes/MecanicaRope";
import AlignGrid from "../geom/AlignGrid";
import Matrix, { MatrixMode } from "../geom/Matrix";
import { Logger } from "../main";
import GameParams from "../settings/GameParams";
import MazePhase, { DEFAULT_EXIT_MESSAGE, DEFAULT_RESTART_MESSAGE, DEFAULT_SKIP_MESSAGE } from "./MazePhase";
import HardcodedPhasesCreator from "./hardcodedPhases/HardcodedPhasesCreator";
import TestApplicationService from "../test-application/TestApplicationService";
import TutorialHelper from "./tutorial/TutorialHelper";

export default class MazePhasesLoader {

  currentPhase: number = -1
  phases: Array<MazePhase>;
  scene: Scene;
  grid: AlignGrid;
  matrixMode: MatrixMode;
  gridCenterX: number;
  gridCenterY: number;
  gridCellWidth: number;
  codeEditor: CodeEditor;
  testApplicationService: TestApplicationService;
  tutorial: TutorialHelper

  constructor(scene: Scene,
    grid: AlignGrid,
    codeEditor: CodeEditor,
    matrixMode: MatrixMode,
    gridCenterX: number,
    gridCenterY: number,
    gridCellWidth: number) {

    this.matrixMode = matrixMode;
    this.gridCenterX = gridCenterX;
    this.gridCenterY = gridCenterY;
    this.gridCellWidth = gridCellWidth;
    this.codeEditor = codeEditor;

    this.scene = scene;
    this.grid = grid;

    this.tutorial = new TutorialHelper(scene, codeEditor);
  }

  //Aqui é carregado, se vier da plataforma, prioriza este, se não, carrega o hardcoded
  async load(gameParams: GameParams): Promise<MazePhasesLoader> {
    this.testApplicationService = new TestApplicationService(gameParams);
    let phasesLoader: MazePhasesLoader;
    try {
      if (gameParams.isPlaygroundTest()) {
        phasesLoader = await this.loadTestItem();
      }
      if (gameParams.isTestApplication()) {
        phasesLoader = this.loadTestApplication();
      }
      if (gameParams.isItemToPlay()) {
        phasesLoader = await this.loadTestItem();
      }
      if (phasesLoader == null) {
        throw new Error("empty phases");
      }
    } catch (e) {
      Logger.error(e);
      phasesLoader = this.createHardCodedPhases(
        gameParams.isAutomaticTesting()
      );
    }
    return phasesLoader;
  }

  //as fases estão em um array
  private async loadTestItem(): Promise<MazePhasesLoader> {
    let item =
      await this.testApplicationService.instantiatePlaygroundItem<MecanicaRope>();
    const mazePhase = this.convertMecanicaRopeToPhase(item);
    this.phases = [mazePhase];
    return this;
  }

  //aqui é aonde busca do json
  private loadTestApplication(): MazePhasesLoader {
    let item = this.testApplicationService.getFirstItem();
    if (item) {
      location.href = item.url;
    }
    return this;
  }

  convertMecanicaRopeToPhase(mecanicaRope: MecanicaRope): MazePhase {
    let phase = new MazePhase(this.scene, this.codeEditor);
    phase.mecanicaRope = mecanicaRope;

    phase.setupTutorialsAndObjectsPositions = () => {

      // Conversão dos polígonos
      phase.poligonos = mecanicaRope.poligonos.map(polygon => {
        return {
        pontos: polygon.pontos.map(point => ({ x: point.x, y: point.y })),
        posicao: polygon.posicao.map(position => ({ x: position.x, y: position.y })),
        cor: polygon.cor
        };
      });

      phase.poligonoDestino = phase.mecanicaRope.poligonoDestino.map(p => {
        return { x: p.x, y: p.y }
      })

      phase.pontosDestino = phase.mecanicaRope.pontosDestino.map(p => {
        return { x: p.x, y: p.y }
      })
      //aqui termina o poligono

      phase.obstacles = new Matrix(
        this.scene,
        MatrixMode.ISOMETRIC,
        phase.mecanicaRope.obstaculos,
        this.gridCenterX,
        this.gridCenterY,
        this.gridCellWidth
      );

      phase.ground = new Matrix(
        this.scene,
        MatrixMode.ISOMETRIC,
        phase.mecanicaRope.mapa,
        this.gridCenterX,
        this.gridCenterY,
        this.gridCellWidth
      );

      phase.skipPhaseMessage =
        mecanicaRope.mensagemAoPularFase || DEFAULT_SKIP_MESSAGE;
      phase.exitPhaseMessage =
        mecanicaRope.mensagemAoSairDoJogo || DEFAULT_EXIT_MESSAGE;
      phase.restartPhaseMessage =
        mecanicaRope.mensagemAoReiniciarFase || DEFAULT_RESTART_MESSAGE;


    };
    return phase;
  }

  private createHardCodedPhases(testing: boolean): MazePhasesLoader {
    this.phases = new HardcodedPhasesCreator(
      this.scene,
      this.codeEditor,
      this.gridCenterX,
      this.gridCenterY,
      this.gridCellWidth)
      .createHardCodedPhases(testing)
    return this;
  }

  getNextPhase(): MazePhase {
    this.currentPhase++;
    return this.phases[this.currentPhase];
  }
}
