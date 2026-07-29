/**
 * Pricing & Geographic Zone Configuration
 *
 * Contains the official OpenStreetMap GIS administrative polygon for Bordj Bou Arréridj commune
 * (OSM Relation ID 4309047), as well as default pricing fallbacks and scalable zone structures.
 */

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface ZoneConfig {
  id: string;
  name: string;
  polygon: Coordinates[];
  pricing: {
    type: 'FLAT' | 'DISTANCE';
    defaultFare?: number;
  };
}

/** Default configuration constants */
export const DEFAULT_CITY_FLAT_FARE = 150;
export const DEFAULT_OUTSIDE_RATE_PER_KM = 40;

/**
 * Official administrative boundary polygon for Bordj Bou Arréridj commune.
 * Extracted directly from OpenStreetMap relation 4309047.
 * Contains 742 precise boundary vertices.
 */
export const BBA_COMMUNE_POLYGON: Coordinates[] = [
  {
    "latitude": 36.0829299,
    "longitude": 4.6882377
  },
  {
    "latitude": 36.0826178,
    "longitude": 4.6884201
  },
  {
    "latitude": 36.0821669,
    "longitude": 4.6883879
  },
  {
    "latitude": 36.0818027,
    "longitude": 4.6886347
  },
  {
    "latitude": 36.080953,
    "longitude": 4.6886347
  },
  {
    "latitude": 36.0807622,
    "longitude": 4.6887634
  },
  {
    "latitude": 36.0806408,
    "longitude": 4.6889458
  },
  {
    "latitude": 36.0804327,
    "longitude": 4.6889351
  },
  {
    "latitude": 36.0801813,
    "longitude": 4.6887098
  },
  {
    "latitude": 36.0799558,
    "longitude": 4.6889136
  },
  {
    "latitude": 36.0797737,
    "longitude": 4.6890102
  },
  {
    "latitude": 36.0791928,
    "longitude": 4.6894072
  },
  {
    "latitude": 36.0789239,
    "longitude": 4.6893106
  },
  {
    "latitude": 36.0787505,
    "longitude": 4.689375
  },
  {
    "latitude": 36.0787158,
    "longitude": 4.6892892
  },
  {
    "latitude": 36.078395,
    "longitude": 4.6892999
  },
  {
    "latitude": 36.0779354,
    "longitude": 4.6889244
  },
  {
    "latitude": 36.0775366,
    "longitude": 4.6890531
  },
  {
    "latitude": 36.0773545,
    "longitude": 4.6889673
  },
  {
    "latitude": 36.0769209,
    "longitude": 4.6891497
  },
  {
    "latitude": 36.0765654,
    "longitude": 4.6895896
  },
  {
    "latitude": 36.0760971,
    "longitude": 4.6899865
  },
  {
    "latitude": 36.0756896,
    "longitude": 4.6901796
  },
  {
    "latitude": 36.0756115,
    "longitude": 4.6904693
  },
  {
    "latitude": 36.0754034,
    "longitude": 4.6904157
  },
  {
    "latitude": 36.0747617,
    "longitude": 4.6908234
  },
  {
    "latitude": 36.0742674,
    "longitude": 4.6909736
  },
  {
    "latitude": 36.0740593,
    "longitude": 4.6912954
  },
  {
    "latitude": 36.0737731,
    "longitude": 4.6913169
  },
  {
    "latitude": 36.073487,
    "longitude": 4.6913276
  },
  {
    "latitude": 36.0734176,
    "longitude": 4.6911989
  },
  {
    "latitude": 36.0731914,
    "longitude": 4.691166
  },
  {
    "latitude": 36.0728966,
    "longitude": 4.6908549
  },
  {
    "latitude": 36.0728706,
    "longitude": 4.6906939
  },
  {
    "latitude": 36.0725671,
    "longitude": 4.6906618
  },
  {
    "latitude": 36.0722202,
    "longitude": 4.6905545
  },
  {
    "latitude": 36.0720728,
    "longitude": 4.6905223
  },
  {
    "latitude": 36.0720554,
    "longitude": 4.6903721
  },
  {
    "latitude": 36.0718993,
    "longitude": 4.6902433
  },
  {
    "latitude": 36.0718213,
    "longitude": 4.6903184
  },
  {
    "latitude": 36.0716479,
    "longitude": 4.6902219
  },
  {
    "latitude": 36.0716305,
    "longitude": 4.6901146
  },
  {
    "latitude": 36.0718039,
    "longitude": 4.6901039
  },
  {
    "latitude": 36.0717943,
    "longitude": 4.6900268
  },
  {
    "latitude": 36.0717693,
    "longitude": 4.6899644
  },
  {
    "latitude": 36.0715091,
    "longitude": 4.6900288
  },
  {
    "latitude": 36.071301,
    "longitude": 4.6900288
  },
  {
    "latitude": 36.071379,
    "longitude": 4.6897927
  },
  {
    "latitude": 36.0713357,
    "longitude": 4.689546
  },
  {
    "latitude": 36.0711275,
    "longitude": 4.6897605
  },
  {
    "latitude": 36.0707546,
    "longitude": 4.6897498
  },
  {
    "latitude": 36.0703297,
    "longitude": 4.6894816
  },
  {
    "latitude": 36.0699221,
    "longitude": 4.6894709
  },
  {
    "latitude": 36.0696706,
    "longitude": 4.6896103
  },
  {
    "latitude": 36.0695059,
    "longitude": 4.6898785
  },
  {
    "latitude": 36.0695232,
    "longitude": 4.6903077
  },
  {
    "latitude": 36.0694191,
    "longitude": 4.6905867
  },
  {
    "latitude": 36.0693064,
    "longitude": 4.6906403
  },
  {
    "latitude": 36.0690983,
    "longitude": 4.6904901
  },
  {
    "latitude": 36.0689162,
    "longitude": 4.6905545
  },
  {
    "latitude": 36.0686733,
    "longitude": 4.6910051
  },
  {
    "latitude": 36.0683525,
    "longitude": 4.6914771
  },
  {
    "latitude": 36.0679795,
    "longitude": 4.6922389
  },
  {
    "latitude": 36.067663,
    "longitude": 4.6925849
  },
  {
    "latitude": 36.0675134,
    "longitude": 4.6924428
  },
  {
    "latitude": 36.0669735,
    "longitude": 4.6925286
  },
  {
    "latitude": 36.066732,
    "longitude": 4.6926454
  },
  {
    "latitude": 36.0663903,
    "longitude": 4.6927458
  },
  {
    "latitude": 36.0662017,
    "longitude": 4.6929792
  },
  {
    "latitude": 36.0662017,
    "longitude": 4.6938053
  },
  {
    "latitude": 36.0662884,
    "longitude": 4.6942881
  },
  {
    "latitude": 36.0661323,
    "longitude": 4.6947816
  },
  {
    "latitude": 36.0658548,
    "longitude": 4.6948245
  },
  {
    "latitude": 36.0653778,
    "longitude": 4.6949747
  },
  {
    "latitude": 36.0651957,
    "longitude": 4.6948245
  },
  {
    "latitude": 36.0650049,
    "longitude": 4.6946851
  },
  {
    "latitude": 36.0647881,
    "longitude": 4.6946636
  },
  {
    "latitude": 36.0644151,
    "longitude": 4.6949962
  },
  {
    "latitude": 36.0643284,
    "longitude": 4.6952215
  },
  {
    "latitude": 36.0640422,
    "longitude": 4.6954146
  },
  {
    "latitude": 36.0636346,
    "longitude": 4.6955756
  },
  {
    "latitude": 36.0634698,
    "longitude": 4.6955219
  },
  {
    "latitude": 36.0631923,
    "longitude": 4.6950606
  },
  {
    "latitude": 36.0629755,
    "longitude": 4.6950391
  },
  {
    "latitude": 36.0627933,
    "longitude": 4.6951142
  },
  {
    "latitude": 36.0626372,
    "longitude": 4.6952644
  },
  {
    "latitude": 36.0625852,
    "longitude": 4.6955219
  },
  {
    "latitude": 36.0626372,
    "longitude": 4.6956828
  },
  {
    "latitude": 36.0627673,
    "longitude": 4.6957365
  },
  {
    "latitude": 36.062802,
    "longitude": 4.6958438
  },
  {
    "latitude": 36.0627586,
    "longitude": 4.6960262
  },
  {
    "latitude": 36.0621255,
    "longitude": 4.6969167
  },
  {
    "latitude": 36.061874,
    "longitude": 4.6970454
  },
  {
    "latitude": 36.0615531,
    "longitude": 4.6970454
  },
  {
    "latitude": 36.0614403,
    "longitude": 4.6968523
  },
  {
    "latitude": 36.0612062,
    "longitude": 4.6968094
  },
  {
    "latitude": 36.0610327,
    "longitude": 4.6969489
  },
  {
    "latitude": 36.0610154,
    "longitude": 4.6970883
  },
  {
    "latitude": 36.060972,
    "longitude": 4.6973136
  },
  {
    "latitude": 36.0607378,
    "longitude": 4.6975819
  },
  {
    "latitude": 36.0606858,
    "longitude": 4.6975175
  },
  {
    "latitude": 36.0602695,
    "longitude": 4.6973565
  },
  {
    "latitude": 36.059619,
    "longitude": 4.697378
  },
  {
    "latitude": 36.0594455,
    "longitude": 4.6974424
  },
  {
    "latitude": 36.0592634,
    "longitude": 4.6976677
  },
  {
    "latitude": 36.0591246,
    "longitude": 4.6978072
  },
  {
    "latitude": 36.0590379,
    "longitude": 4.6985474
  },
  {
    "latitude": 36.0588644,
    "longitude": 4.6988693
  },
  {
    "latitude": 36.0582486,
    "longitude": 4.6992556
  },
  {
    "latitude": 36.0577282,
    "longitude": 4.6996418
  },
  {
    "latitude": 36.0573379,
    "longitude": 4.6998671
  },
  {
    "latitude": 36.0568435,
    "longitude": 4.6996632
  },
  {
    "latitude": 36.0565746,
    "longitude": 4.6996632
  },
  {
    "latitude": 36.0560715,
    "longitude": 4.6997276
  },
  {
    "latitude": 36.0559501,
    "longitude": 4.6996311
  },
  {
    "latitude": 36.0557073,
    "longitude": 4.6996418
  },
  {
    "latitude": 36.0557333,
    "longitude": 4.6998456
  },
  {
    "latitude": 36.0556639,
    "longitude": 4.7002211
  },
  {
    "latitude": 36.0553777,
    "longitude": 4.7005752
  },
  {
    "latitude": 36.0552736,
    "longitude": 4.700543
  },
  {
    "latitude": 36.0551261,
    "longitude": 4.7003928
  },
  {
    "latitude": 36.0546491,
    "longitude": 4.7005216
  },
  {
    "latitude": 36.0542848,
    "longitude": 4.7005108
  },
  {
    "latitude": 36.0536949,
    "longitude": 4.7005216
  },
  {
    "latitude": 36.0535388,
    "longitude": 4.7005859
  },
  {
    "latitude": 36.0534347,
    "longitude": 4.7008756
  },
  {
    "latitude": 36.0532612,
    "longitude": 4.7011653
  },
  {
    "latitude": 36.0529923,
    "longitude": 4.7012189
  },
  {
    "latitude": 36.0525933,
    "longitude": 4.7014335
  },
  {
    "latitude": 36.052229,
    "longitude": 4.7017983
  },
  {
    "latitude": 36.0518907,
    "longitude": 4.7027853
  },
  {
    "latitude": 36.05183,
    "longitude": 4.7032467
  },
  {
    "latitude": 36.0514917,
    "longitude": 4.7037187
  },
  {
    "latitude": 36.0511361,
    "longitude": 4.7039548
  },
  {
    "latitude": 36.0505983,
    "longitude": 4.7040084
  },
  {
    "latitude": 36.0503554,
    "longitude": 4.7041157
  },
  {
    "latitude": 36.050208,
    "longitude": 4.7045878
  },
  {
    "latitude": 36.0503207,
    "longitude": 4.7053173
  },
  {
    "latitude": 36.0502513,
    "longitude": 4.705489
  },
  {
    "latitude": 36.0497309,
    "longitude": 4.7055963
  },
  {
    "latitude": 36.0493318,
    "longitude": 4.7054783
  },
  {
    "latitude": 36.0492104,
    "longitude": 4.7055963
  },
  {
    "latitude": 36.0491237,
    "longitude": 4.7059933
  },
  {
    "latitude": 36.0488287,
    "longitude": 4.7061005
  },
  {
    "latitude": 36.0484644,
    "longitude": 4.7064439
  },
  {
    "latitude": 36.0481868,
    "longitude": 4.7068945
  },
  {
    "latitude": 36.0475015,
    "longitude": 4.70727
  },
  {
    "latitude": 36.0473107,
    "longitude": 4.7073451
  },
  {
    "latitude": 36.0469724,
    "longitude": 4.7077313
  },
  {
    "latitude": 36.0467902,
    "longitude": 4.7081498
  },
  {
    "latitude": 36.0467121,
    "longitude": 4.7090403
  },
  {
    "latitude": 36.0465994,
    "longitude": 4.7093085
  },
  {
    "latitude": 36.0461656,
    "longitude": 4.7096303
  },
  {
    "latitude": 36.0456018,
    "longitude": 4.7099629
  },
  {
    "latitude": 36.0453155,
    "longitude": 4.7098986
  },
  {
    "latitude": 36.0452982,
    "longitude": 4.7097591
  },
  {
    "latitude": 36.045142,
    "longitude": 4.709684
  },
  {
    "latitude": 36.0449425,
    "longitude": 4.7099522
  },
  {
    "latitude": 36.0446909,
    "longitude": 4.7105316
  },
  {
    "latitude": 36.0447169,
    "longitude": 4.71095
  },
  {
    "latitude": 36.0448557,
    "longitude": 4.7112075
  },
  {
    "latitude": 36.0450206,
    "longitude": 4.7112289
  },
  {
    "latitude": 36.045116,
    "longitude": 4.7113899
  },
  {
    "latitude": 36.0450986,
    "longitude": 4.7117332
  },
  {
    "latitude": 36.0448904,
    "longitude": 4.7119048
  },
  {
    "latitude": 36.0446909,
    "longitude": 4.7118619
  },
  {
    "latitude": 36.0445781,
    "longitude": 4.711583
  },
  {
    "latitude": 36.0441444,
    "longitude": 4.7116366
  },
  {
    "latitude": 36.0436499,
    "longitude": 4.7115401
  },
  {
    "latitude": 36.0435632,
    "longitude": 4.7116903
  },
  {
    "latitude": 36.0436239,
    "longitude": 4.7122267
  },
  {
    "latitude": 36.0432248,
    "longitude": 4.7129348
  },
  {
    "latitude": 36.0429299,
    "longitude": 4.7128812
  },
  {
    "latitude": 36.0426349,
    "longitude": 4.713085
  },
  {
    "latitude": 36.0423573,
    "longitude": 4.7128704
  },
  {
    "latitude": 36.0421578,
    "longitude": 4.7127417
  },
  {
    "latitude": 36.0419323,
    "longitude": 4.7128812
  },
  {
    "latitude": 36.0418281,
    "longitude": 4.7130528
  },
  {
    "latitude": 36.041698,
    "longitude": 4.7132352
  },
  {
    "latitude": 36.0417067,
    "longitude": 4.7135034
  },
  {
    "latitude": 36.0418195,
    "longitude": 4.7136429
  },
  {
    "latitude": 36.0419583,
    "longitude": 4.7136429
  },
  {
    "latitude": 36.0421144,
    "longitude": 4.7137395
  },
  {
    "latitude": 36.0421752,
    "longitude": 4.7140506
  },
  {
    "latitude": 36.042019,
    "longitude": 4.7145978
  },
  {
    "latitude": 36.0416893,
    "longitude": 4.7157887
  },
  {
    "latitude": 36.0412167,
    "longitude": 4.7159448
  },
  {
    "latitude": 36.0412167,
    "longitude": 4.7163676
  },
  {
    "latitude": 36.0410194,
    "longitude": 4.7166603
  },
  {
    "latitude": 36.0408091,
    "longitude": 4.7168717
  },
  {
    "latitude": 36.0405329,
    "longitude": 4.7179287
  },
  {
    "latitude": 36.0402831,
    "longitude": 4.7181726
  },
  {
    "latitude": 36.0397702,
    "longitude": 4.7182865
  },
  {
    "latitude": 36.0397045,
    "longitude": 4.7185954
  },
  {
    "latitude": 36.0392837,
    "longitude": 4.7189207
  },
  {
    "latitude": 36.0391785,
    "longitude": 4.7196199
  },
  {
    "latitude": 36.0382317,
    "longitude": 4.7213274
  },
  {
    "latitude": 36.0378241,
    "longitude": 4.7214575
  },
  {
    "latitude": 36.0375743,
    "longitude": 4.7216852
  },
  {
    "latitude": 36.037377,
    "longitude": 4.7223519
  },
  {
    "latitude": 36.0370746,
    "longitude": 4.7224333
  },
  {
    "latitude": 36.0369036,
    "longitude": 4.7225633
  },
  {
    "latitude": 36.037022,
    "longitude": 4.7230187
  },
  {
    "latitude": 36.0359568,
    "longitude": 4.7236854
  },
  {
    "latitude": 36.0356675,
    "longitude": 4.7242221
  },
  {
    "latitude": 36.035707,
    "longitude": 4.7244172
  },
  {
    "latitude": 36.0360357,
    "longitude": 4.7245148
  },
  {
    "latitude": 36.0362067,
    "longitude": 4.7247912
  },
  {
    "latitude": 36.0361278,
    "longitude": 4.7255555
  },
  {
    "latitude": 36.0359305,
    "longitude": 4.7257832
  },
  {
    "latitude": 36.0351809,
    "longitude": 4.7257507
  },
  {
    "latitude": 36.0347338,
    "longitude": 4.7264825
  },
  {
    "latitude": 36.0347338,
    "longitude": 4.7265909
  },
  {
    "latitude": 36.0347338,
    "longitude": 4.7269703
  },
  {
    "latitude": 36.0344051,
    "longitude": 4.7276371
  },
  {
    "latitude": 36.0341158,
    "longitude": 4.7277509
  },
  {
    "latitude": 36.0323273,
    "longitude": 4.7273443
  },
  {
    "latitude": 36.0318144,
    "longitude": 4.7273769
  },
  {
    "latitude": 36.031341,
    "longitude": 4.7276858
  },
  {
    "latitude": 36.03117,
    "longitude": 4.7279785
  },
  {
    "latitude": 36.0312884,
    "longitude": 4.7283526
  },
  {
    "latitude": 36.0318276,
    "longitude": 4.7286941
  },
  {
    "latitude": 36.0321432,
    "longitude": 4.7283688
  },
  {
    "latitude": 36.0322747,
    "longitude": 4.7283363
  },
  {
    "latitude": 36.0323404,
    "longitude": 4.7286615
  },
  {
    "latitude": 36.0323404,
    "longitude": 4.7289543
  },
  {
    "latitude": 36.0324325,
    "longitude": 4.7294259
  },
  {
    "latitude": 36.0328139,
    "longitude": 4.7298487
  },
  {
    "latitude": 36.0326692,
    "longitude": 4.7300763
  },
  {
    "latitude": 36.032564,
    "longitude": 4.7303528
  },
  {
    "latitude": 36.0322878,
    "longitude": 4.7306292
  },
  {
    "latitude": 36.0318013,
    "longitude": 4.7307105
  },
  {
    "latitude": 36.0313541,
    "longitude": 4.7304178
  },
  {
    "latitude": 36.0312752,
    "longitude": 4.7301414
  },
  {
    "latitude": 36.0312489,
    "longitude": 4.7299137
  },
  {
    "latitude": 36.0309859,
    "longitude": 4.7299137
  },
  {
    "latitude": 36.0304862,
    "longitude": 4.7303528
  },
  {
    "latitude": 36.0302757,
    "longitude": 4.7306292
  },
  {
    "latitude": 36.0301311,
    "longitude": 4.7307593
  },
  {
    "latitude": 36.0294735,
    "longitude": 4.7305317
  },
  {
    "latitude": 36.0292631,
    "longitude": 4.7307105
  },
  {
    "latitude": 36.029079,
    "longitude": 4.730678
  },
  {
    "latitude": 36.0285924,
    "longitude": 4.7309219
  },
  {
    "latitude": 36.0279743,
    "longitude": 4.7315074
  },
  {
    "latitude": 36.0277638,
    "longitude": 4.731979
  },
  {
    "latitude": 36.0273035,
    "longitude": 4.7320765
  },
  {
    "latitude": 36.0271326,
    "longitude": 4.731979
  },
  {
    "latitude": 36.0268169,
    "longitude": 4.7313122
  },
  {
    "latitude": 36.0264355,
    "longitude": 4.7310195
  },
  {
    "latitude": 36.0260015,
    "longitude": 4.7310033
  },
  {
    "latitude": 36.0255675,
    "longitude": 4.7314749
  },
  {
    "latitude": 36.025002,
    "longitude": 4.7318164
  },
  {
    "latitude": 36.0247258,
    "longitude": 4.7318001
  },
  {
    "latitude": 36.0245154,
    "longitude": 4.7315236
  },
  {
    "latitude": 36.0239235,
    "longitude": 4.731361
  },
  {
    "latitude": 36.0234763,
    "longitude": 4.7315562
  },
  {
    "latitude": 36.0226083,
    "longitude": 4.7325319
  },
  {
    "latitude": 36.0221217,
    "longitude": 4.7332799
  },
  {
    "latitude": 36.0221348,
    "longitude": 4.7339304
  },
  {
    "latitude": 36.0217271,
    "longitude": 4.7345321
  },
  {
    "latitude": 36.0207932,
    "longitude": 4.736077
  },
  {
    "latitude": 36.0203197,
    "longitude": 4.7364185
  },
  {
    "latitude": 36.0199515,
    "longitude": 4.736516
  },
  {
    "latitude": 36.019399,
    "longitude": 4.7362396
  },
  {
    "latitude": 36.0188861,
    "longitude": 4.736516
  },
  {
    "latitude": 36.0179522,
    "longitude": 4.7365973
  },
  {
    "latitude": 36.0174129,
    "longitude": 4.7370527
  },
  {
    "latitude": 36.0170446,
    "longitude": 4.7370689
  },
  {
    "latitude": 36.0161897,
    "longitude": 4.7363209
  },
  {
    "latitude": 36.0152689,
    "longitude": 4.7363209
  },
  {
    "latitude": 36.0154715,
    "longitude": 4.7367905
  },
  {
    "latitude": 36.0155846,
    "longitude": 4.7370527
  },
  {
    "latitude": 36.0156467,
    "longitude": 4.7373437
  },
  {
    "latitude": 36.015811,
    "longitude": 4.7381139
  },
  {
    "latitude": 36.0159003,
    "longitude": 4.7385325
  },
  {
    "latitude": 36.0158735,
    "longitude": 4.7386547
  },
  {
    "latitude": 36.0157783,
    "longitude": 4.7390893
  },
  {
    "latitude": 36.0157293,
    "longitude": 4.7393131
  },
  {
    "latitude": 36.0158139,
    "longitude": 4.7401896
  },
  {
    "latitude": 36.0158345,
    "longitude": 4.7404026
  },
  {
    "latitude": 36.0160028,
    "longitude": 4.7407757
  },
  {
    "latitude": 36.016216,
    "longitude": 4.7412482
  },
  {
    "latitude": 36.0170973,
    "longitude": 4.742224
  },
  {
    "latitude": 36.0171604,
    "longitude": 4.7422547
  },
  {
    "latitude": 36.0174655,
    "longitude": 4.7424028
  },
  {
    "latitude": 36.0175576,
    "longitude": 4.7433623
  },
  {
    "latitude": 36.0175445,
    "longitude": 4.7433785
  },
  {
    "latitude": 36.0173998,
    "longitude": 4.7434761
  },
  {
    "latitude": 36.0171762,
    "longitude": 4.7437688
  },
  {
    "latitude": 36.0171367,
    "longitude": 4.7441754
  },
  {
    "latitude": 36.0174129,
    "longitude": 4.7445331
  },
  {
    "latitude": 36.0174905,
    "longitude": 4.7447249
  },
  {
    "latitude": 36.0175708,
    "longitude": 4.7449234
  },
  {
    "latitude": 36.017505,
    "longitude": 4.7451836
  },
  {
    "latitude": 36.0173866,
    "longitude": 4.7454113
  },
  {
    "latitude": 36.0176365,
    "longitude": 4.7461268
  },
  {
    "latitude": 36.0174655,
    "longitude": 4.7467448
  },
  {
    "latitude": 36.0172551,
    "longitude": 4.7468911
  },
  {
    "latitude": 36.0170183,
    "longitude": 4.7473464
  },
  {
    "latitude": 36.0166895,
    "longitude": 4.7476229
  },
  {
    "latitude": 36.0165054,
    "longitude": 4.7483222
  },
  {
    "latitude": 36.0164264,
    "longitude": 4.7486799
  },
  {
    "latitude": 36.01665,
    "longitude": 4.7492653
  },
  {
    "latitude": 36.0166632,
    "longitude": 4.7496556
  },
  {
    "latitude": 36.0171499,
    "longitude": 4.7513631
  },
  {
    "latitude": 36.0174261,
    "longitude": 4.7515257
  },
  {
    "latitude": 36.0174551,
    "longitude": 4.7518125
  },
  {
    "latitude": 36.0174787,
    "longitude": 4.7520461
  },
  {
    "latitude": 36.0173874,
    "longitude": 4.7521439
  },
  {
    "latitude": 36.0172814,
    "longitude": 4.7522575
  },
  {
    "latitude": 36.0173486,
    "longitude": 4.7524845
  },
  {
    "latitude": 36.0174787,
    "longitude": 4.7529243
  },
  {
    "latitude": 36.0176551,
    "longitude": 4.7530115
  },
  {
    "latitude": 36.0178075,
    "longitude": 4.7530869
  },
  {
    "latitude": 36.0180245,
    "longitude": 4.7534102
  },
  {
    "latitude": 36.0183205,
    "longitude": 4.7538512
  },
  {
    "latitude": 36.018413,
    "longitude": 4.7540504
  },
  {
    "latitude": 36.0186715,
    "longitude": 4.7546072
  },
  {
    "latitude": 36.0187282,
    "longitude": 4.7547293
  },
  {
    "latitude": 36.0188395,
    "longitude": 4.7547522
  },
  {
    "latitude": 36.018965,
    "longitude": 4.7547781
  },
  {
    "latitude": 36.0192412,
    "longitude": 4.7545992
  },
  {
    "latitude": 36.0193514,
    "longitude": 4.7547354
  },
  {
    "latitude": 36.0194254,
    "longitude": 4.7548269
  },
  {
    "latitude": 36.0194609,
    "longitude": 4.7550908
  },
  {
    "latitude": 36.0194911,
    "longitude": 4.7553148
  },
  {
    "latitude": 36.0195622,
    "longitude": 4.7558421
  },
  {
    "latitude": 36.0195963,
    "longitude": 4.7560953
  },
  {
    "latitude": 36.0197014,
    "longitude": 4.7560823
  },
  {
    "latitude": 36.0198594,
    "longitude": 4.7560628
  },
  {
    "latitude": 36.0201066,
    "longitude": 4.7557017
  },
  {
    "latitude": 36.0201488,
    "longitude": 4.75564
  },
  {
    "latitude": 36.0202812,
    "longitude": 4.7555792
  },
  {
    "latitude": 36.0204882,
    "longitude": 4.7554841
  },
  {
    "latitude": 36.0206091,
    "longitude": 4.7554286
  },
  {
    "latitude": 36.0206848,
    "longitude": 4.7554679
  },
  {
    "latitude": 36.0209341,
    "longitude": 4.7555971
  },
  {
    "latitude": 36.0210168,
    "longitude": 4.75564
  },
  {
    "latitude": 36.0211323,
    "longitude": 4.7558737
  },
  {
    "latitude": 36.0211615,
    "longitude": 4.7559327
  },
  {
    "latitude": 36.0213234,
    "longitude": 4.756011
  },
  {
    "latitude": 36.021464,
    "longitude": 4.7560791
  },
  {
    "latitude": 36.0216496,
    "longitude": 4.7559997
  },
  {
    "latitude": 36.021806,
    "longitude": 4.7559327
  },
  {
    "latitude": 36.0219507,
    "longitude": 4.7561766
  },
  {
    "latitude": 36.0219638,
    "longitude": 4.7565507
  },
  {
    "latitude": 36.0217928,
    "longitude": 4.7568922
  },
  {
    "latitude": 36.0217534,
    "longitude": 4.7572499
  },
  {
    "latitude": 36.02224,
    "longitude": 4.7575101
  },
  {
    "latitude": 36.0226872,
    "longitude": 4.7575264
  },
  {
    "latitude": 36.0228319,
    "longitude": 4.7578028
  },
  {
    "latitude": 36.0228713,
    "longitude": 4.7581606
  },
  {
    "latitude": 36.0231738,
    "longitude": 4.7581931
  },
  {
    "latitude": 36.0235562,
    "longitude": 4.7580065
  },
  {
    "latitude": 36.0236736,
    "longitude": 4.7579492
  },
  {
    "latitude": 36.024397,
    "longitude": 4.7581931
  },
  {
    "latitude": 36.024711,
    "longitude": 4.7585679
  },
  {
    "latitude": 36.0247784,
    "longitude": 4.7586484
  },
  {
    "latitude": 36.0250942,
    "longitude": 4.7586484
  },
  {
    "latitude": 36.0252387,
    "longitude": 4.7586484
  },
  {
    "latitude": 36.0255149,
    "longitude": 4.7584208
  },
  {
    "latitude": 36.0257516,
    "longitude": 4.7584696
  },
  {
    "latitude": 36.0257779,
    "longitude": 4.7586322
  },
  {
    "latitude": 36.0259095,
    "longitude": 4.7591851
  },
  {
    "latitude": 36.026176,
    "longitude": 4.7590583
  },
  {
    "latitude": 36.0262514,
    "longitude": 4.7590225
  },
  {
    "latitude": 36.0264881,
    "longitude": 4.7591851
  },
  {
    "latitude": 36.0265068,
    "longitude": 4.7593666
  },
  {
    "latitude": 36.026567,
    "longitude": 4.7599494
  },
  {
    "latitude": 36.0267665,
    "longitude": 4.7605594
  },
  {
    "latitude": 36.0268169,
    "longitude": 4.7607137
  },
  {
    "latitude": 36.0270989,
    "longitude": 4.7610495
  },
  {
    "latitude": 36.027172,
    "longitude": 4.7611365
  },
  {
    "latitude": 36.0272813,
    "longitude": 4.7611436
  },
  {
    "latitude": 36.0276718,
    "longitude": 4.761169
  },
  {
    "latitude": 36.0278814,
    "longitude": 4.7613526
  },
  {
    "latitude": 36.0279874,
    "longitude": 4.7614455
  },
  {
    "latitude": 36.0280712,
    "longitude": 4.7616398
  },
  {
    "latitude": 36.0281978,
    "longitude": 4.7619333
  },
  {
    "latitude": 36.0284167,
    "longitude": 4.7622603
  },
  {
    "latitude": 36.0287424,
    "longitude": 4.7627469
  },
  {
    "latitude": 36.0288291,
    "longitude": 4.7628765
  },
  {
    "latitude": 36.0291682,
    "longitude": 4.7629012
  },
  {
    "latitude": 36.0292763,
    "longitude": 4.7629091
  },
  {
    "latitude": 36.0293689,
    "longitude": 4.7630522
  },
  {
    "latitude": 36.0294341,
    "longitude": 4.763153
  },
  {
    "latitude": 36.0293768,
    "longitude": 4.7633047
  },
  {
    "latitude": 36.029342,
    "longitude": 4.7633969
  },
  {
    "latitude": 36.0293678,
    "longitude": 4.7636412
  },
  {
    "latitude": 36.0294209,
    "longitude": 4.764145
  },
  {
    "latitude": 36.0299601,
    "longitude": 4.7651857
  },
  {
    "latitude": 36.0307623,
    "longitude": 4.7658037
  },
  {
    "latitude": 36.0317223,
    "longitude": 4.766259
  },
  {
    "latitude": 36.0324325,
    "longitude": 4.7667469
  },
  {
    "latitude": 36.0330637,
    "longitude": 4.7671697
  },
  {
    "latitude": 36.0332741,
    "longitude": 4.7681779
  },
  {
    "latitude": 36.0338133,
    "longitude": 4.7687308
  },
  {
    "latitude": 36.0354176,
    "longitude": 4.7690235
  },
  {
    "latitude": 36.0360226,
    "longitude": 4.768682
  },
  {
    "latitude": 36.0365223,
    "longitude": 4.7689259
  },
  {
    "latitude": 36.0373244,
    "longitude": 4.7700318
  },
  {
    "latitude": 36.0376407,
    "longitude": 4.7703121
  },
  {
    "latitude": 36.0372069,
    "longitude": 4.7709773
  },
  {
    "latitude": 36.0372416,
    "longitude": 4.7718141
  },
  {
    "latitude": 36.0372416,
    "longitude": 4.7726725
  },
  {
    "latitude": 36.0366516,
    "longitude": 4.7759126
  },
  {
    "latitude": 36.0388498,
    "longitude": 4.7812199
  },
  {
    "latitude": 36.0370483,
    "longitude": 4.7827485
  },
  {
    "latitude": 36.0416112,
    "longitude": 4.7851716
  },
  {
    "latitude": 36.0435309,
    "longitude": 4.7850415
  },
  {
    "latitude": 36.0462658,
    "longitude": 4.7853179
  },
  {
    "latitude": 36.0512095,
    "longitude": 4.7799352
  },
  {
    "latitude": 36.0519589,
    "longitude": 4.779301
  },
  {
    "latitude": 36.0525111,
    "longitude": 4.7789758
  },
  {
    "latitude": 36.0539047,
    "longitude": 4.7785205
  },
  {
    "latitude": 36.054228,
    "longitude": 4.7785265
  },
  {
    "latitude": 36.0547724,
    "longitude": 4.7785367
  },
  {
    "latitude": 36.0543911,
    "longitude": 4.7793823
  },
  {
    "latitude": 36.0542597,
    "longitude": 4.780602
  },
  {
    "latitude": 36.0544569,
    "longitude": 4.7815126
  },
  {
    "latitude": 36.0542334,
    "longitude": 4.7828949
  },
  {
    "latitude": 36.0536417,
    "longitude": 4.7836429
  },
  {
    "latitude": 36.0527083,
    "longitude": 4.7847325
  },
  {
    "latitude": 36.0525637,
    "longitude": 4.7852529
  },
  {
    "latitude": 36.0526688,
    "longitude": 4.7856594
  },
  {
    "latitude": 36.053668,
    "longitude": 4.7871067
  },
  {
    "latitude": 36.0539836,
    "longitude": 4.7876596
  },
  {
    "latitude": 36.0540362,
    "longitude": 4.7887329
  },
  {
    "latitude": 36.0541707,
    "longitude": 4.7893244
  },
  {
    "latitude": 36.054188,
    "longitude": 4.7898179
  },
  {
    "latitude": 36.0541013,
    "longitude": 4.7903007
  },
  {
    "latitude": 36.0543962,
    "longitude": 4.7909551
  },
  {
    "latitude": 36.0546044,
    "longitude": 4.7918885
  },
  {
    "latitude": 36.0545468,
    "longitude": 4.7923997
  },
  {
    "latitude": 36.0547185,
    "longitude": 4.7935322
  },
  {
    "latitude": 36.0546498,
    "longitude": 4.794056
  },
  {
    "latitude": 36.0544209,
    "longitude": 4.7943533
  },
  {
    "latitude": 36.0545354,
    "longitude": 4.7948629
  },
  {
    "latitude": 36.0549932,
    "longitude": 4.7953443
  },
  {
    "latitude": 36.0552678,
    "longitude": 4.7958114
  },
  {
    "latitude": 36.0561148,
    "longitude": 4.7974253
  },
  {
    "latitude": 36.0564238,
    "longitude": 4.7984588
  },
  {
    "latitude": 36.0575476,
    "longitude": 4.8005045
  },
  {
    "latitude": 36.0589896,
    "longitude": 4.8013822
  },
  {
    "latitude": 36.0603286,
    "longitude": 4.8019202
  },
  {
    "latitude": 36.0619994,
    "longitude": 4.8013539
  },
  {
    "latitude": 36.0625487,
    "longitude": 4.8006461
  },
  {
    "latitude": 36.0630866,
    "longitude": 4.800278
  },
  {
    "latitude": 36.0646658,
    "longitude": 4.799018
  },
  {
    "latitude": 36.065662,
    "longitude": 4.7984861
  },
  {
    "latitude": 36.0660391,
    "longitude": 4.7981969
  },
  {
    "latitude": 36.0672063,
    "longitude": 4.7980412
  },
  {
    "latitude": 36.0678576,
    "longitude": 4.7982035
  },
  {
    "latitude": 36.0685774,
    "longitude": 4.7984824
  },
  {
    "latitude": 36.0684349,
    "longitude": 4.7988893
  },
  {
    "latitude": 36.0682354,
    "longitude": 4.7998495
  },
  {
    "latitude": 36.0680706,
    "longitude": 4.8026551
  },
  {
    "latitude": 36.0681747,
    "longitude": 4.803669
  },
  {
    "latitude": 36.0687601,
    "longitude": 4.8077138
  },
  {
    "latitude": 36.069662,
    "longitude": 4.8137648
  },
  {
    "latitude": 36.0698354,
    "longitude": 4.814371
  },
  {
    "latitude": 36.0701086,
    "longitude": 4.8149772
  },
  {
    "latitude": 36.0702951,
    "longitude": 4.8153366
  },
  {
    "latitude": 36.0708067,
    "longitude": 4.8161413
  },
  {
    "latitude": 36.0710365,
    "longitude": 4.8165597
  },
  {
    "latitude": 36.0712577,
    "longitude": 4.8171605
  },
  {
    "latitude": 36.0713877,
    "longitude": 4.8176272
  },
  {
    "latitude": 36.0714528,
    "longitude": 4.8181744
  },
  {
    "latitude": 36.0715265,
    "longitude": 4.8191346
  },
  {
    "latitude": 36.0715742,
    "longitude": 4.8200627
  },
  {
    "latitude": 36.0716912,
    "longitude": 4.8227395
  },
  {
    "latitude": 36.0717606,
    "longitude": 4.8245849
  },
  {
    "latitude": 36.0718532,
    "longitude": 4.8270418
  },
  {
    "latitude": 36.0718796,
    "longitude": 4.8276162
  },
  {
    "latitude": 36.0719285,
    "longitude": 4.8281436
  },
  {
    "latitude": 36.0719757,
    "longitude": 4.8284702
  },
  {
    "latitude": 36.0720405,
    "longitude": 4.828766
  },
  {
    "latitude": 36.0721301,
    "longitude": 4.8290432
  },
  {
    "latitude": 36.0723094,
    "longitude": 4.8294376
  },
  {
    "latitude": 36.0731312,
    "longitude": 4.8309104
  },
  {
    "latitude": 36.0734898,
    "longitude": 4.831619
  },
  {
    "latitude": 36.0736293,
    "longitude": 4.8319641
  },
  {
    "latitude": 36.0737289,
    "longitude": 4.8322414
  },
  {
    "latitude": 36.0745195,
    "longitude": 4.8350324
  },
  {
    "latitude": 36.0747026,
    "longitude": 4.83496
  },
  {
    "latitude": 36.0748422,
    "longitude": 4.8349576
  },
  {
    "latitude": 36.0760274,
    "longitude": 4.8351538
  },
  {
    "latitude": 36.0766955,
    "longitude": 4.8352449
  },
  {
    "latitude": 36.0772069,
    "longitude": 4.8352659
  },
  {
    "latitude": 36.077524,
    "longitude": 4.8352635
  },
  {
    "latitude": 36.0778523,
    "longitude": 4.8352612
  },
  {
    "latitude": 36.0781939,
    "longitude": 4.8353172
  },
  {
    "latitude": 36.0785091,
    "longitude": 4.8354387
  },
  {
    "latitude": 36.0787412,
    "longitude": 4.8355624
  },
  {
    "latitude": 36.0789846,
    "longitude": 4.8357819
  },
  {
    "latitude": 36.079096,
    "longitude": 4.8358169
  },
  {
    "latitude": 36.0792696,
    "longitude": 4.8357796
  },
  {
    "latitude": 36.0798848,
    "longitude": 4.8355647
  },
  {
    "latitude": 36.080083,
    "longitude": 4.835511
  },
  {
    "latitude": 36.0802717,
    "longitude": 4.8354854
  },
  {
    "latitude": 36.0811907,
    "longitude": 4.835518
  },
  {
    "latitude": 36.0814624,
    "longitude": 4.835518
  },
  {
    "latitude": 36.0822833,
    "longitude": 4.8354246
  },
  {
    "latitude": 36.0827475,
    "longitude": 4.835406
  },
  {
    "latitude": 36.083157,
    "longitude": 4.835406
  },
  {
    "latitude": 36.0847761,
    "longitude": 4.8353756
  },
  {
    "latitude": 36.086482,
    "longitude": 4.8353009
  },
  {
    "latitude": 36.0867767,
    "longitude": 4.8352373
  },
  {
    "latitude": 36.0872881,
    "longitude": 4.8350934
  },
  {
    "latitude": 36.089525,
    "longitude": 4.8349218
  },
  {
    "latitude": 36.0898718,
    "longitude": 4.8351149
  },
  {
    "latitude": 36.0904613,
    "longitude": 4.8351363
  },
  {
    "latitude": 36.0915711,
    "longitude": 4.835823
  },
  {
    "latitude": 36.092282,
    "longitude": 4.8362307
  },
  {
    "latitude": 36.0927328,
    "longitude": 4.836338
  },
  {
    "latitude": 36.0930622,
    "longitude": 4.8370461
  },
  {
    "latitude": 36.0935131,
    "longitude": 4.8368744
  },
  {
    "latitude": 36.0940506,
    "longitude": 4.8371104
  },
  {
    "latitude": 36.0946228,
    "longitude": 4.8375825
  },
  {
    "latitude": 36.0958711,
    "longitude": 4.8391704
  },
  {
    "latitude": 36.0963739,
    "longitude": 4.8394279
  },
  {
    "latitude": 36.0967207,
    "longitude": 4.8399214
  },
  {
    "latitude": 36.0973102,
    "longitude": 4.8398999
  },
  {
    "latitude": 36.0978304,
    "longitude": 4.8402647
  },
  {
    "latitude": 36.0982291,
    "longitude": 4.8402862
  },
  {
    "latitude": 36.0984545,
    "longitude": 4.8406295
  },
  {
    "latitude": 36.098888,
    "longitude": 4.8403935
  },
  {
    "latitude": 36.0994775,
    "longitude": 4.840608
  },
  {
    "latitude": 36.1001536,
    "longitude": 4.8413376
  },
  {
    "latitude": 36.1008818,
    "longitude": 4.8414878
  },
  {
    "latitude": 36.1012459,
    "longitude": 4.8412732
  },
  {
    "latitude": 36.1013672,
    "longitude": 4.8414449
  },
  {
    "latitude": 36.1017313,
    "longitude": 4.8416809
  },
  {
    "latitude": 36.101714,
    "longitude": 4.8413591
  },
  {
    "latitude": 36.1020607,
    "longitude": 4.8413591
  },
  {
    "latitude": 36.1023208,
    "longitude": 4.841638
  },
  {
    "latitude": 36.1031876,
    "longitude": 4.8413591
  },
  {
    "latitude": 36.103465,
    "longitude": 4.8410587
  },
  {
    "latitude": 36.1038984,
    "longitude": 4.8409514
  },
  {
    "latitude": 36.1044879,
    "longitude": 4.8408226
  },
  {
    "latitude": 36.1049213,
    "longitude": 4.8405008
  },
  {
    "latitude": 36.1053027,
    "longitude": 4.8403291
  },
  {
    "latitude": 36.1055974,
    "longitude": 4.8403505
  },
  {
    "latitude": 36.1060308,
    "longitude": 4.8406724
  },
  {
    "latitude": 36.1062042,
    "longitude": 4.8408655
  },
  {
    "latitude": 36.1060828,
    "longitude": 4.8412089
  },
  {
    "latitude": 36.1061695,
    "longitude": 4.841402
  },
  {
    "latitude": 36.1063429,
    "longitude": 4.8413591
  },
  {
    "latitude": 36.1067429,
    "longitude": 4.8413646
  },
  {
    "latitude": 36.106977,
    "longitude": 4.8414397
  },
  {
    "latitude": 36.107289,
    "longitude": 4.8414022
  },
  {
    "latitude": 36.1075491,
    "longitude": 4.8414773
  },
  {
    "latitude": 36.1076834,
    "longitude": 4.8415899
  },
  {
    "latitude": 36.1077397,
    "longitude": 4.8417348
  },
  {
    "latitude": 36.1077354,
    "longitude": 4.8419118
  },
  {
    "latitude": 36.1076574,
    "longitude": 4.8421317
  },
  {
    "latitude": 36.1075837,
    "longitude": 4.8424161
  },
  {
    "latitude": 36.1076487,
    "longitude": 4.8425341
  },
  {
    "latitude": 36.1080301,
    "longitude": 4.8425823
  },
  {
    "latitude": 36.1082772,
    "longitude": 4.842577
  },
  {
    "latitude": 36.1085719,
    "longitude": 4.8423839
  },
  {
    "latitude": 36.1090443,
    "longitude": 4.8421156
  },
  {
    "latitude": 36.1094777,
    "longitude": 4.8421317
  },
  {
    "latitude": 36.109677,
    "longitude": 4.8421907
  },
  {
    "latitude": 36.110002,
    "longitude": 4.8423141
  },
  {
    "latitude": 36.1103141,
    "longitude": 4.8426682
  },
  {
    "latitude": 36.1104441,
    "longitude": 4.8426574
  },
  {
    "latitude": 36.1105351,
    "longitude": 4.8425609
  },
  {
    "latitude": 36.1107518,
    "longitude": 4.8424965
  },
  {
    "latitude": 36.1108991,
    "longitude": 4.8426145
  },
  {
    "latitude": 36.1109858,
    "longitude": 4.8426038
  },
  {
    "latitude": 36.1110812,
    "longitude": 4.8424697
  },
  {
    "latitude": 36.1112285,
    "longitude": 4.8424268
  },
  {
    "latitude": 36.1113282,
    "longitude": 4.8426843
  },
  {
    "latitude": 36.1114062,
    "longitude": 4.8427862
  },
  {
    "latitude": 36.1114929,
    "longitude": 4.8427862
  },
  {
    "latitude": 36.1116446,
    "longitude": 4.8426574
  },
  {
    "latitude": 36.1120953,
    "longitude": 4.842518
  },
  {
    "latitude": 36.1123943,
    "longitude": 4.8424214
  },
  {
    "latitude": 36.1127583,
    "longitude": 4.8425072
  },
  {
    "latitude": 36.1131917,
    "longitude": 4.8427916
  },
  {
    "latitude": 36.1134647,
    "longitude": 4.8433065
  },
  {
    "latitude": 36.1136901,
    "longitude": 4.8436981
  },
  {
    "latitude": 36.1140064,
    "longitude": 4.8441327
  },
  {
    "latitude": 36.1149381,
    "longitude": 4.8449588
  },
  {
    "latitude": 36.1152372,
    "longitude": 4.8450446
  },
  {
    "latitude": 36.1156272,
    "longitude": 4.8451573
  },
  {
    "latitude": 36.1159782,
    "longitude": 4.8453718
  },
  {
    "latitude": 36.1165199,
    "longitude": 4.8453665
  },
  {
    "latitude": 36.1166976,
    "longitude": 4.8454577
  },
  {
    "latitude": 36.1167322,
    "longitude": 4.8457152
  },
  {
    "latitude": 36.1168362,
    "longitude": 4.8458868
  },
  {
    "latitude": 36.1173606,
    "longitude": 4.8460531
  },
  {
    "latitude": 36.1178459,
    "longitude": 4.8458976
  },
  {
    "latitude": 36.1184093,
    "longitude": 4.8458064
  },
  {
    "latitude": 36.1189423,
    "longitude": 4.8458976
  },
  {
    "latitude": 36.1197829,
    "longitude": 4.8458761
  },
  {
    "latitude": 36.1197569,
    "longitude": 4.8457903
  },
  {
    "latitude": 36.1199649,
    "longitude": 4.8456293
  },
  {
    "latitude": 36.1199389,
    "longitude": 4.8452109
  },
  {
    "latitude": 36.1198176,
    "longitude": 4.8451465
  },
  {
    "latitude": 36.1197223,
    "longitude": 4.8450071
  },
  {
    "latitude": 36.1198609,
    "longitude": 4.8448032
  },
  {
    "latitude": 36.1201296,
    "longitude": 4.8446316
  },
  {
    "latitude": 36.1199823,
    "longitude": 4.8439449
  },
  {
    "latitude": 36.1198696,
    "longitude": 4.8438484
  },
  {
    "latitude": 36.1197483,
    "longitude": 4.8435909
  },
  {
    "latitude": 36.1199996,
    "longitude": 4.8429471
  },
  {
    "latitude": 36.1198263,
    "longitude": 4.8424858
  },
  {
    "latitude": 36.1197569,
    "longitude": 4.8416489
  },
  {
    "latitude": 36.1196443,
    "longitude": 4.8412734
  },
  {
    "latitude": 36.1194623,
    "longitude": 4.841134
  },
  {
    "latitude": 36.1196009,
    "longitude": 4.8405868
  },
  {
    "latitude": 36.1197656,
    "longitude": 4.8404366
  },
  {
    "latitude": 36.1198263,
    "longitude": 4.8403293
  },
  {
    "latitude": 36.1195489,
    "longitude": 4.8400825
  },
  {
    "latitude": 36.1193496,
    "longitude": 4.8394388
  },
  {
    "latitude": 36.1189423,
    "longitude": 4.8387843
  },
  {
    "latitude": 36.1188556,
    "longitude": 4.8383659
  },
  {
    "latitude": 36.1189596,
    "longitude": 4.8380655
  },
  {
    "latitude": 36.1189423,
    "longitude": 4.8377651
  },
  {
    "latitude": 36.1186303,
    "longitude": 4.837572
  },
  {
    "latitude": 36.1187689,
    "longitude": 4.8364776
  },
  {
    "latitude": 36.1186649,
    "longitude": 4.8358768
  },
  {
    "latitude": 36.1184049,
    "longitude": 4.8352546
  },
  {
    "latitude": 36.1184396,
    "longitude": 4.8346323
  },
  {
    "latitude": 36.1183356,
    "longitude": 4.8339242
  },
  {
    "latitude": 36.1184396,
    "longitude": 4.8330444
  },
  {
    "latitude": 36.1183356,
    "longitude": 4.8326582
  },
  {
    "latitude": 36.1182143,
    "longitude": 4.8327655
  },
  {
    "latitude": 36.1180583,
    "longitude": 4.8322934
  },
  {
    "latitude": 36.1179196,
    "longitude": 4.8313922
  },
  {
    "latitude": 36.1176769,
    "longitude": 4.830727
  },
  {
    "latitude": 36.1175036,
    "longitude": 4.8296326
  },
  {
    "latitude": 36.1171569,
    "longitude": 4.8278946
  },
  {
    "latitude": 36.1165849,
    "longitude": 4.8267144
  },
  {
    "latitude": 36.1157182,
    "longitude": 4.8267144
  },
  {
    "latitude": 36.1148861,
    "longitude": 4.826414
  },
  {
    "latitude": 36.1141408,
    "longitude": 4.826414
  },
  {
    "latitude": 36.1136207,
    "longitude": 4.8263711
  },
  {
    "latitude": 36.112754,
    "longitude": 4.8260921
  },
  {
    "latitude": 36.1121993,
    "longitude": 4.8257273
  },
  {
    "latitude": 36.1119913,
    "longitude": 4.8252124
  },
  {
    "latitude": 36.1117659,
    "longitude": 4.8253197
  },
  {
    "latitude": 36.1116619,
    "longitude": 4.8250622
  },
  {
    "latitude": 36.1118526,
    "longitude": 4.823882
  },
  {
    "latitude": 36.1121126,
    "longitude": 4.8220581
  },
  {
    "latitude": 36.1119046,
    "longitude": 4.8203415
  },
  {
    "latitude": 36.1108298,
    "longitude": 4.8194188
  },
  {
    "latitude": 36.1097203,
    "longitude": 4.8171657
  },
  {
    "latitude": 36.1088362,
    "longitude": 4.8160499
  },
  {
    "latitude": 36.1096337,
    "longitude": 4.8145908
  },
  {
    "latitude": 36.1090096,
    "longitude": 4.8131102
  },
  {
    "latitude": 36.1071373,
    "longitude": 4.8108357
  },
  {
    "latitude": 36.1051437,
    "longitude": 4.8082393
  },
  {
    "latitude": 36.1020925,
    "longitude": 4.8071355
  },
  {
    "latitude": 36.1003786,
    "longitude": 4.807035
  },
  {
    "latitude": 36.0997197,
    "longitude": 4.8068822
  },
  {
    "latitude": 36.1000318,
    "longitude": 4.8043233
  },
  {
    "latitude": 36.1000687,
    "longitude": 4.8033282
  },
  {
    "latitude": 36.1005584,
    "longitude": 4.8003832
  },
  {
    "latitude": 36.1006993,
    "longitude": 4.799211
  },
  {
    "latitude": 36.100786,
    "longitude": 4.7988087
  },
  {
    "latitude": 36.1009052,
    "longitude": 4.7984037
  },
  {
    "latitude": 36.1011956,
    "longitude": 4.7977492
  },
  {
    "latitude": 36.1016225,
    "longitude": 4.7971216
  },
  {
    "latitude": 36.1019536,
    "longitude": 4.7962397
  },
  {
    "latitude": 36.1042271,
    "longitude": 4.7895623
  },
  {
    "latitude": 36.106211,
    "longitude": 4.7854969
  },
  {
    "latitude": 36.1077053,
    "longitude": 4.7815234
  },
  {
    "latitude": 36.1065373,
    "longitude": 4.7809119
  },
  {
    "latitude": 36.1050204,
    "longitude": 4.7801635
  },
  {
    "latitude": 36.1038805,
    "longitude": 4.7794125
  },
  {
    "latitude": 36.1019735,
    "longitude": 4.7781975
  },
  {
    "latitude": 36.099863,
    "longitude": 4.7767952
  },
  {
    "latitude": 36.1065449,
    "longitude": 4.7627855
  },
  {
    "latitude": 36.1071863,
    "longitude": 4.758687
  },
  {
    "latitude": 36.1069089,
    "longitude": 4.7565627
  },
  {
    "latitude": 36.1063022,
    "longitude": 4.7534943
  },
  {
    "latitude": 36.1054873,
    "longitude": 4.7509837
  },
  {
    "latitude": 36.1051753,
    "longitude": 4.7499538
  },
  {
    "latitude": 36.1050886,
    "longitude": 4.7484732
  },
  {
    "latitude": 36.1056607,
    "longitude": 4.7481728
  },
  {
    "latitude": 36.1068742,
    "longitude": 4.7479153
  },
  {
    "latitude": 36.1068222,
    "longitude": 4.7474003
  },
  {
    "latitude": 36.1062501,
    "longitude": 4.7446323
  },
  {
    "latitude": 36.1049499,
    "longitude": 4.7451258
  },
  {
    "latitude": 36.1044818,
    "longitude": 4.7454906
  },
  {
    "latitude": 36.1039791,
    "longitude": 4.7459626
  },
  {
    "latitude": 36.1035283,
    "longitude": 4.7460485
  },
  {
    "latitude": 36.1030653,
    "longitude": 4.746317
  },
  {
    "latitude": 36.1026878,
    "longitude": 4.7467134
  },
  {
    "latitude": 36.1023675,
    "longitude": 4.7474496
  },
  {
    "latitude": 36.1020034,
    "longitude": 4.7478197
  },
  {
    "latitude": 36.101713,
    "longitude": 4.7481845
  },
  {
    "latitude": 36.1010499,
    "longitude": 4.7475407
  },
  {
    "latitude": 36.1005298,
    "longitude": 4.7469346
  },
  {
    "latitude": 36.0986443,
    "longitude": 4.7484151
  },
  {
    "latitude": 36.0969208,
    "longitude": 4.7452755
  },
  {
    "latitude": 36.0971631,
    "longitude": 4.7445857
  },
  {
    "latitude": 36.0975406,
    "longitude": 4.7436088
  },
  {
    "latitude": 36.0986559,
    "longitude": 4.7410667
  },
  {
    "latitude": 36.09888,
    "longitude": 4.7404197
  },
  {
    "latitude": 36.0992711,
    "longitude": 4.7393011
  },
  {
    "latitude": 36.1005969,
    "longitude": 4.7345904
  },
  {
    "latitude": 36.1005979,
    "longitude": 4.7345869
  },
  {
    "latitude": 36.0989165,
    "longitude": 4.7348134
  },
  {
    "latitude": 36.0980929,
    "longitude": 4.7351532
  },
  {
    "latitude": 36.0962626,
    "longitude": 4.7361442
  },
  {
    "latitude": 36.0956221,
    "longitude": 4.7361725
  },
  {
    "latitude": 36.0950272,
    "longitude": 4.7364698
  },
  {
    "latitude": 36.0944552,
    "longitude": 4.7369228
  },
  {
    "latitude": 36.0939748,
    "longitude": 4.7378571
  },
  {
    "latitude": 36.0935859,
    "longitude": 4.7382677
  },
  {
    "latitude": 36.0924533,
    "longitude": 4.7382535
  },
  {
    "latitude": 36.0888841,
    "longitude": 4.7378996
  },
  {
    "latitude": 36.0875261,
    "longitude": 4.7376608
  },
  {
    "latitude": 36.0941211,
    "longitude": 4.7293322
  },
  {
    "latitude": 36.1000604,
    "longitude": 4.720858
  },
  {
    "latitude": 36.0993003,
    "longitude": 4.7196034
  },
  {
    "latitude": 36.0984836,
    "longitude": 4.7187935
  },
  {
    "latitude": 36.0976947,
    "longitude": 4.7178815
  },
  {
    "latitude": 36.0963596,
    "longitude": 4.7150705
  },
  {
    "latitude": 36.0951893,
    "longitude": 4.7134827
  },
  {
    "latitude": 36.094331,
    "longitude": 4.7101997
  },
  {
    "latitude": 36.0944871,
    "longitude": 4.709277
  },
  {
    "latitude": 36.09525,
    "longitude": 4.7053395
  },
  {
    "latitude": 36.0957268,
    "longitude": 4.7041593
  },
  {
    "latitude": 36.0963596,
    "longitude": 4.7022603
  },
  {
    "latitude": 36.0961516,
    "longitude": 4.7010801
  },
  {
    "latitude": 36.0958135,
    "longitude": 4.6983443
  },
  {
    "latitude": 36.0938282,
    "longitude": 4.6959947
  },
  {
    "latitude": 36.0925191,
    "longitude": 4.6934627
  },
  {
    "latitude": 36.0890338,
    "longitude": 4.6899007
  },
  {
    "latitude": 36.0875686,
    "longitude": 4.6902011
  },
  {
    "latitude": 36.0867536,
    "longitude": 4.6901045
  },
  {
    "latitude": 36.086138,
    "longitude": 4.6898578
  },
  {
    "latitude": 36.0856178,
    "longitude": 4.6894608
  },
  {
    "latitude": 36.0848201,
    "longitude": 4.6892141
  },
  {
    "latitude": 36.0838837,
    "longitude": 4.6889566
  },
  {
    "latitude": 36.0833288,
    "longitude": 4.6883772
  },
  {
    "latitude": 36.0829299,
    "longitude": 4.6882377
  }
];

/**
 * Extensible pricing zones list. Allows adding future cities or custom zones.
 */
export const ZONES: ZoneConfig[] = [
  {
    id: 'bba_city',
    name: 'Bordj Bou Arréridj',
    polygon: BBA_COMMUNE_POLYGON,
    pricing: {
      type: 'FLAT',
      defaultFare: DEFAULT_CITY_FLAT_FARE,
    },
  },
];
