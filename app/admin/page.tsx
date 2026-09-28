        {tab === "cards" && (
          <div>
            <h2 style={sectionTitleStyle}>Mastery Cards</h2>

            <div
              style={{
                background:
                  "linear-gradient(135deg, rgba(155,248,0,0.08), rgba(3,71,244,0.1)), var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "14px",
                padding: "1rem",
                marginBottom: "1rem",
                color: "var(--text-muted)",
                fontSize: "0.85rem",
                lineHeight: 1.6,
              }}
            >
              Design boost cards that managers buy in the shop with coins and
              field from the player market on the transfers page — the
              special version replaces the player&apos;s normal card in the
              squad. Each card multiplies one stat&apos;s points for that
              player, its transfers price replaces the player&apos;s price in
              the squad budget, and the copy is consumed once the gameweek it
              was used in is scored. Only one version of a player can be
              fielded at a time.
            </div>

            <div
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "14px",
                padding: "1.25rem",
                marginBottom: "2rem",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "1rem",
                  marginBottom: "1rem",
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <div style={{ fontWeight: 800, fontSize: "1rem" }}>
                    Create Mastery Card
                  </div>
                  <div
                    style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}
                  >
                    Pick the player, the stat, and the multiplier.
                  </div>
                </div>

                <button
                  onClick={handleAddLimitedCard}
                  disabled={saving === "newLimitedCard"}
                  style={primaryButtonStyle(saved === "newLimitedCard")}
                >
                  {saving === "newLimitedCard"
                    ? "Adding..."
                    : saved === "newLimitedCard"
                    ? "Added"
                    : "Add Card"}
                </button>
              </div>

              <LimitedCardFields
                card={newCard}
                players={players}
                onChange={(patch) => setNewCard({ ...newCard, ...patch })}
              />
            </div>

            {limitedCards.length === 0 ? (
              <div
                style={{
                  border: "1px dashed var(--border)",
                  borderRadius: "12px",
                  padding: "2rem 1rem",
                  textAlign: "center",
                  color: "var(--text-muted)",
                }}
              >
                No mastery cards yet. Create the first one above.
              </div>
            ) : (
              <div
                className="admin-shop-grid"
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))",
                  gap: "1rem",
                }}
              >
                {limitedCards.map((card) => (
                  <LimitedCardEditor
                    key={card.id}
                    card={card}
                    players={players}
                    saving={saving}
                    saved={saved}
                    onChange={updateLimitedCardPatch}
                    onSave={handleUpdateLimitedCard}
                    onDelete={() => {
                      if (confirm(`Delete "${card.cardName || "card"}"?`)) {
                        deleteDoc(doc(db, "limitedCards", card.id)).then(() =>
                          setLimitedCards(
                            limitedCards.filter((c) => c.id !== card.id)
                          )
                        );
                      }
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "fixtures" && (
          <div style={{ display: "grid", gap: "1rem", maxWidth: "1100px" }}>
            <div
              style={{
                background:
                  "linear-gradient(135deg, rgba(3,71,244,0.12), rgba(255,193,7,0.08)), var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "14px",
                padding: "1rem",
              }}
            >
              <h2 style={{ ...sectionTitleStyle, marginBottom: "0.5rem" }}>
                Player Fixtures
              </h2>
              <p style={{ color: "var(--text-muted)", lineHeight: 1.6 }}>
                Pair esports players for each gameweek. The Fixtures page
                compares their saved gameweek scores automatically: win = 3
                PTS, draw = 1 PTS, loss = 0 PTS.
              </p>
            </div>

            <section style={panelStyle}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
                  gap: "0.75rem",
                  alignItems: "end",
                }}
              >
                <div>
                  <div style={labelStyle}>Gameweek</div>
                  <input
                    type="number"
                    min="1"
                    value={fixtureGameweek}
                    onChange={(event) =>
                      setFixtureGameweek(
                        Math.max(1, Number(event.target.value) || 1)
                      )
                    }
                    style={inputStyle}
                  />
                </div>

                <div>
                  <div style={labelStyle}>Player One</div>
                  <select
                    value={newFixturePlayerOne}
                    onChange={(event) => setNewFixturePlayerOne(event.target.value)}
                    style={inputStyle}
                  >
                    <option value="">Choose player</option>
                    {players.map((player) => (
                      <option key={player.id} value={player.id}>
                        {player.name} · {player.game}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div style={labelStyle}>Player Two</div>
                  <select
                    value={newFixturePlayerTwo}
                    onChange={(event) => setNewFixturePlayerTwo(event.target.value)}
                    style={inputStyle}
                  >
                    <option value="">Choose player</option>
                    {players.map((player) => (
                      <option key={player.id} value={player.id}>
                        {player.name} · {player.game}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={handleAddFixture}
                  disabled={saving === "newFixture"}
                  style={{
                    background:
                      saved === "newFixture" ? "var(--green)" : "var(--accent)",
                    color: "#000",
                    border: "none",
                    borderRadius: "8px",
                    padding: "0.65rem 1rem",
                    minHeight: "38px",
                    fontWeight: 900,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  {saving === "newFixture"
                    ? "Adding..."
                    : saved === "newFixture"
                    ? "Added"
                    : "Add Fixture"}
                </button>
              </div>
            </section>

            <section style={panelStyle}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "1rem",
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <h2 style={{ ...sectionTitleStyle, marginBottom: "0.3rem" }}>
                    GW{fixtureGameweek} Fixtures
                  </h2>
                  <p style={{ color: "var(--text-muted)", fontSize: "0.82rem" }}>
                    Edit either player, move a fixture to another gameweek, or
                    remove it.
                  </p>
                </div>
                <div
                  style={{
                    color: "var(--text-muted)",
                    fontSize: "0.8rem",
                    fontWeight: 800,
                  }}
                >
                  {selectedFixtures.length} fixture
                  {selectedFixtures.length === 1 ? "" : "s"}
                </div>
              </div>

              {selectedFixtures.length === 0 ? (
                <div
                  style={{
                    border: "1px dashed var(--border)",
                    borderRadius: "12px",
                    padding: "2rem 1rem",
                    textAlign: "center",
                    color: "var(--text-muted)",
                  }}
                >
                  No fixtures are scheduled for GW{fixtureGameweek} yet.
                </div>
              ) : (
                <div style={{ display: "grid", gap: "0.75rem" }}>
                  {selectedFixtures.map((fixture) => (
                    <div
                      key={fixture.id}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(175px, 1fr))",
                        gap: "0.65rem",
                        alignItems: "end",
                        padding: "0.85rem",
                        border: "1px solid var(--border)",
                        borderRadius: "12px",
                        background: "rgba(255,255,255,0.025)",
                      }}
                    >
                      <div>
                        <div style={smallLabelStyle}>Gameweek</div>
                        <input
                          type="number"
                          min="1"
                          value={fixture.gameweek}
                          onChange={(event) =>
                            updateFixtureField(
                              fixture.id,
                              "gameweek",
                              Math.max(1, Number(event.target.value) || 1)
                            )
                          }
                          style={inputStyle}
                        />
                      </div>

                      <div>
                        <div style={smallLabelStyle}>Player One</div>
                        <select
                          value={fixture.playerOneId}
                          onChange={(event) =>
                            updateFixtureField(
                              fixture.id,
                              "playerOneId",
                              event.target.value
                            )
                          }
                          style={inputStyle}
                        >
                          <option value="">Choose player</option>
                          {players.map((player) => (
                            <option key={player.id} value={player.id}>
                              {player.name} · {player.game}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <div style={smallLabelStyle}>Player Two</div>
                        <select
                          value={fixture.playerTwoId}
                          onChange={(event) =>
                            updateFixtureField(
                              fixture.id,
                              "playerTwoId",
                              event.target.value
                            )
                          }
                          style={inputStyle}
                        >
                          <option value="">Choose player</option>
                          {players.map((player) => (
                            <option key={player.id} value={player.id}>
                              {player.name} · {player.game}
                            </option>
                          ))}
                        </select>
                      </div>

                      <button
                        onClick={() => handleSaveFixture(fixture)}
                        disabled={saving === fixture.id}
                        style={{
                          background:
                            saved === fixture.id ? "var(--green)" : "var(--accent)",
                          color: "#000",
                          border: "none",
                          borderRadius: "8px",
                          padding: "0.6rem 0.85rem",
                          fontWeight: 900,
                          cursor: "pointer",
                        }}
                      >
                        {saving === fixture.id
                          ? "Saving..."
                          : saved === fixture.id
                          ? "Saved"
                          : "Save"}
                      </button>

                      <button
                        onClick={() => handleDeleteFixture(fixture)}
                        disabled={saving === fixture.id}
                        title={`Delete ${playerLabel(fixture.playerOneId)} vs ${playerLabel(fixture.playerTwoId)}`}
                        style={{
                          background: "transparent",
                          color: "var(--red)",
                          border: "1px solid var(--border)",
                          borderRadius: "8px",
                          padding: "0.6rem 0.75rem",
                          fontWeight: 900,
                          cursor: "pointer",
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {tab === "stats" && (
          <div
            className="admin-stats-layout"
            style={{
              display: "grid",
              gridTemplateColumns: "300px 1fr",
              gap: "2rem",
            }}
          >
            <div
              style={{
                background: "var(--surface)",
                borderRadius: "12px",
                border: "1px solid var(--border)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  padding: "1rem",
                  borderBottom: "1px solid var(--border)",
                  fontWeight: 700,
                }}
              >
                Select Player
              </div>

              <div className="admin-player-selector" style={{ maxHeight: "600px", overflowY: "auto" }}>
                {players.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => setSelectedPlayerId(p.id)}
                    style={{
                      padding: "0.75rem 1rem",
                      cursor: "pointer",
                      borderBottom: "1px solid var(--border)",
                      background:
                        selectedPlayerId === p.id
                          ? "rgba(3,71,244,0.15)"
                          : "transparent",
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>
                      {p.name}
                    </div>
                    <div
                      style={{
                        fontSize: "0.7rem",
                        color: "var(--text-muted)",
                      }}
                    >
                      {p.game}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div
              style={{
                background: "var(--surface)",
                borderRadius: "12px",
                border: "1px solid var(--border)",
                padding: "1.5rem",
              }}
            >
              {activePlayer ? (
                <div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "1.5rem",
                    }}
                  >
                    <div>
                      <h2 style={{ fontSize: "1.25rem", fontWeight: 700 }}>
                        {activePlayer.name}
                      </h2>
                      <p style={{ color: "var(--accent)", fontSize: "0.8rem" }}>
                        GW{settings?.currentGameweek} Rules
                      </p>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <div
                        style={{
                          fontSize: "0.7rem",
                          color: "var(--text-muted)",
                        }}
                      >
                        CALCULATED GW POINTS
                      </div>
                      <div
                        style={{
                          fontSize: "2rem",
                          fontWeight: 800,
                          color: "var(--accent)",
                        }}
                      >
                        {calculatePoints(activePlayer)}
                      </div>
                    </div>
                  </div>

                  <div
                    className="admin-stats-grid"
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(3, 1fr)",
                      gap: "1rem",
                    }}
                  >
                    {["matchWin", "matchLose", "mvp", "svp", "bonus"].map(
                      (f) => (
                        <StatInput
                          key={f}
                          label={f.replace(/([A-Z])/g, " $1").trim()}
                          id={f}
                          val={calcStats}
                          set={setCalcStats}
                        />
                      )
                    )}

                    <div
                      style={{
                        gridColumn: "1/-1",
                        borderTop: "1px solid var(--border)",
                        margin: "0.5rem 0",
                      }}
                    />

                    {activePlayer.game === "Valorant"
                      ? [
                          "kills",
                          "assists",
                          "deaths",
                          "firstBlood",
                          "firstDeath",
                          "tripleKill",
                          "quadraKill",
                          "ace",
                          "clutch",
                        ].map((f) => (
                          <StatInput
                            key={f}
                            label={f.replace(/([A-Z])/g, " $1").trim()}
                            id={f}
                            val={calcStats}
                            set={setCalcStats}
                          />
                        ))
                      : [
                          "kills",
                          "assists",
                          "deaths",
                          "lastKills",
                          "headKill",
                          "healing",
                          "damage",
                          "blocked",
                          "soloKills",
                        ].map((f) => (
                          <StatInput
                            key={f}
                            label={f.replace(/([A-Z])/g, " $1").trim()}
                            id={f}
                            val={calcStats}
                            set={setCalcStats}
                          />
                        ))}
                  </div>

                  <button
                    onClick={handleSaveStats}
                    disabled={saving === "matchstats"}
                    style={{
                      width: "100%",
                      marginTop: "2rem",
                      background:
                        saved === "matchstats"
                          ? "var(--green)"
                          : "var(--blue)",
                      color: "#fff",
                      border: "none",
                      padding: "1rem",
                      borderRadius: "8px",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    {saving === "matchstats"
                      ? "Saving..."
                      : saved === "matchstats"
                      ? "✓ Saved Success!"
                      : "Save Match Stats"}
                  </button>
                </div>
              ) : (
                <div
                  style={{
                    height: "400px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--text-muted)",
                  }}
                >
                  Select a player to start.
                </div>
              )}
            </div>
          </div>
        )}

        {tab === "managers" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid var(--border)",
                borderRadius: "10px",
                padding: "1rem",
                color: "var(--text-muted)",
                fontSize: "0.85rem",
              }}
            >
              Showing current GW points from{" "}
              <strong style={{ color: "#fff" }}>gameweekTeams.gwPoints</strong>
              {settings?.currentGameweek ? (
                <>
                  {" "}
                  for{" "}
                  <strong style={{ color: "#fff" }}>
                    GW{settings.currentGameweek}
                  </strong>
                </>
              ) : null}
              .
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "1rem",
                flexWrap: "wrap",
                background:
                  "linear-gradient(135deg, rgba(3,71,244,0.12), rgba(255,193,7,0.08)), var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "10px",
                padding: "1rem",
              }}
            >
              <div>
                <div style={{ fontWeight: 800, marginBottom: "0.25rem" }}>
                  Grant Ranking Coins
                </div>

                <div style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>
                  Rewards managers based on their current GW points rank:
                  1st 4,000¢ · 2nd 3,000¢ · 3rd 2,500¢ · 4th 1,500¢ ·
                  5th or more 1,000¢
                </div>
              </div>

              <button
                onClick={handleGrantRankingCoins}
                disabled={saving === "grantRankingCoins"}
                style={{
                  background:
                    saved === "grantRankingCoins"
                      ? "var(--green)"
                      : "var(--blue)",
                  color: "#fff",
                  border: "none",
                  borderRadius: "8px",
                  padding: "0.75rem 1rem",
                  fontWeight: 900,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {saving === "grantRankingCoins"
                  ? "Granting..."
                  : saved === "grantRankingCoins"
                  ? "Granted"
                  : "Grant Coins"}
              </button>
            </div>

            {managers.map((m) => (
              <div
                key={m.id}
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: "10px",
                  padding: "1rem",
                }}
              >
                <div
                  style={{
                    fontWeight: 700,
                    marginBottom: "1rem",
                    fontSize: "1.1rem",
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "1rem",
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <span>{m.manager || "Unknown Manager"}</span>

                    {m.lastGwCoinsEarned !== undefined &&
                      Number(m.lastGwCoinsEarned || 0) > 0 && (
                        <span
                          style={{
                            marginLeft: "0.5rem",
                            fontSize: "0.75rem",
                            color: "var(--accent)",
                            fontWeight: 700,
                          }}
                        >
                          Last Coins: {m.lastGwCoinsEarned}¢
                          {m.lastGwCoinsGameweek
                            ? ` · GW${m.lastGwCoinsGameweek}`
                            : ""}
                        </span>
                      )}
                  </div>

                  <span
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--text-muted)",
                      fontWeight: 500,
                    }}
                  >
                    {m.ownerEmail}
                  </span>
                </div>

                <div
                  className="admin-manager-inputs"
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(6, minmax(100px, 1fr)) 100px",
                    gap: "0.75rem",
                    alignItems: "end",
                    overflowX: "auto",
                  }}
                >
                  <div>
                    <div style={{ fontSize: "0.7rem" }}>Total Points</div>
                    <input
                      type="number"
                      value={m.totalPoints ?? 0}
                      onChange={(e) =>
                        updateManagerField(
                          m.id,
                          "totalPoints",
                          Number(e.target.value)
                        )
                      }
                      style={inputStyle}
                    />
                  </div>

                  <div>
                    <div style={{ fontSize: "0.7rem" }}>
                      GW Points
                      {settings?.currentGameweek
                        ? ` - GW${settings.currentGameweek}`
                        : ""}
                    </div>
                    <input
                      type="number"
                      value={m.gameweekPoints ?? 0}
                      onChange={(e) =>
                        updateManagerField(
                          m.id,
                          "gameweekPoints",
                          Number(e.target.value)
                        )
                      }
                      style={inputStyle}
                    />
                  </div>

                  <div>
                    <div style={{ fontSize: "0.7rem" }}>Coins</div>
                    <input
                      type="number"
                      value={m.coins ?? 0}
                      onChange={(e) =>
                        updateManagerField(m.id, "coins", Number(e.target.value))
                      }
                      style={inputStyle}
                    />
                  </div>

                  <div>
                    <div style={{ fontSize: "0.7rem" }}>Bank</div>
                    <input
                      type="number"
                      step="0.1"
                      value={m.Bank ?? 0}
                      onChange={(e) =>
                        updateManagerField(m.id, "Bank", Number(e.target.value))
                      }
                      style={inputStyle}
                    />
                  </div>

                  <div>
                    <div style={{ fontSize: "0.7rem" }}>Free Trans</div>
                    <input
                      type="number"
                      value={m.freeTransfers ?? 0}
                      onChange={(e) =>
                        updateManagerField(
                          m.id,
                          "freeTransfers",
                          Number(e.target.value)
                        )
                      }
                      style={inputStyle}
                    />
                  </div>

                  <label
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.45rem",
                      fontSize: "0.7rem",
                    }}
                  >
                    Leaderboard
                    <span
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.45rem",
                        minHeight: "38px",
                        color:
                          m.showInLeaderboard !== false
                            ? "var(--green)"
                            : "var(--text-muted)",
                        fontSize: "0.8rem",
                        fontWeight: 700,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={m.showInLeaderboard !== false}
                        onChange={(e) =>
                          updateManagerField(
                            m.id,
                            "showInLeaderboard",
                            e.target.checked
                          )
                        }
                        style={{
                          width: "18px",
                          height: "18px",
                          accentColor: "var(--blue)",
                        }}
                      />
                      {m.showInLeaderboard !== false ? "Shown" : "Hidden"}
                    </span>
                  </label>

                  <button
                    onClick={() => handleSaveManager(m)}
                    disabled={saving === m.id}
                    style={{
                      background:
                        saved === m.id ? "var(--green)" : "var(--accent)",
                      color: "#000",
                      border: "none",
                      borderRadius: "6px",
                      padding: "0.6rem",
                      fontWeight: 700,
                      cursor: "pointer",
                      width: "100%",
                    }}
                  >
                    {saving === m.id
                      ? "Saving..."
                      : saved === m.id
                      ? "Saved"
                      : "Save"}
                  </button>
                </div>

                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    gap: "0.5rem",
                    marginTop: "0.85rem",
                  }}
                >
                  <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                    Titles:
                  </div>

                  {(m.titles || []).length === 0 && (
                    <div
                      style={{
                        fontSize: "0.75rem",
                        color: "var(--text-muted)",
                      }}
                    >
                      None yet
                    </div>
                  )}

                  {(m.titles || []).map((title) => (
                    <span
                      key={title}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.4rem",
                        background: "rgba(255,193,7,0.08)",
                        border: "1px solid rgba(255,193,7,0.35)",
                        color: "var(--accent)",
                        borderRadius: "999px",
                        padding: "0.3rem 0.3rem 0.3rem 0.7rem",
                        fontSize: "0.75rem",
                        fontWeight: 800,
                      }}
                    >
                      🏆 {title}
                      <button
                        type="button"
                        onClick={() =>
                          updateManagerField(
                            m.id,
                            "titles",
                            (m.titles || []).filter((t) => t !== title)
                          )
                        }
                        style={{
                          background: "rgba(0,0,0,0.35)",
                          border: "none",
                          color: "#fff",
                          width: "20px",
                          height: "20px",
                          borderRadius: "999px",
                          cursor: "pointer",
                          fontSize: "0.65rem",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        ✕
                      </button>
                    </span>
                  ))}

                  <input
                    value={titleDrafts[m.id] || ""}
                    onChange={(e) =>
                      setTitleDrafts({ ...titleDrafts, [m.id]: e.target.value })
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") addManagerTitle(m);
                    }}
                    placeholder="New title, e.g. Season 2025 Champion"
                    style={{
                      ...inputStyle,
                      maxWidth: "280px",
                      minHeight: "34px",
                    }}
                  />

                  <button
                    type="button"
                    onClick={() => addManagerTitle(m)}
                    style={secondaryButtonStyle}
                  >
                    Add Title
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "players" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {players.map((p) => (
              <div
                key={p.id}
                className="admin-player-row"
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  padding: "0.75rem 1rem",
                  display: "grid",
                  gridTemplateColumns: "1.5fr 0.7fr 2fr minmax(132px, 0.9fr) auto",
                  gap: "0.75rem",
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={{ fontWeight: 600 }}>{p.name}</div>
                  <div
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--text-muted)",
                    }}
                  >
                    {p.game}
                  </div>
                </div>

                <input
                  type="number"
                  step="0.1"
                  value={p.price}
                  onChange={(e) =>
                    setPlayers((prev) =>
                      prev.map((x) =>
                        x.id === p.id
                          ? { ...x, price: Number(e.target.value) }
                          : x
                      )
                    )
                  }
                  style={inputStyle}
                />

                <input
                  type="text"
                  value={p.desc}
                  onChange={(e) =>
                    setPlayers((prev) =>
                      prev.map((x) =>
                        x.id === p.id ? { ...x, desc: e.target.value } : x
                      )
                    )
                  }
                  style={inputStyle}
                />

                <label
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.45rem",
                    fontSize: "0.7rem",
                  }}
                >
                  Transfers
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.45rem",
                      minHeight: "38px",
                      color:
                        p.showInTransfers !== false
                          ? "var(--green)"
                          : "var(--text-muted)",
                      fontSize: "0.8rem",
                      fontWeight: 700,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={p.showInTransfers !== false}
                      onChange={(e) =>
                        setPlayers((prev) =>
                          prev.map((x) =>
                            x.id === p.id
                              ? { ...x, showInTransfers: e.target.checked }
                              : x
                          )
                        )
                      }
                      style={{
                        width: "18px",
                        height: "18px",
                        accentColor: "var(--blue)",
                      }}
                    />
                    {p.showInTransfers !== false ? "Shown" : "Hidden"}
                  </span>
                </label>

                <button
                  onClick={async () => {
                    setSaving(p.id);

                    try {
                      await updateDoc(doc(db, "players", p.id), {
                        price: p.price,
                        desc: p.desc,
                        showInTransfers: p.showInTransfers !== false,
                      });

                      await syncCurrentGameweekScores();

                      markSaved(p.id);
                    } catch (err) {
                      console.error(err);
                    }

                    setSaving(null);
                  }}
                  disabled={saving === p.id}
                  style={{
                    background:
                      saved === p.id ? "var(--green)" : "var(--accent)",
                    color: "#000",
                    border: "none",
                    borderRadius: "6px",
                    padding: "0.6rem 1.2rem",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  {saving === p.id
                    ? "Saving..."
                    : saved === p.id
                    ? "Saved"
                    : "Save"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </Shell>
  );
}

function LockRow({
  title,
  desc,
  checked,
  onChange,
}: {
  title: string;
  desc: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div
      className="admin-lock-row"
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <div>
        <div style={{ fontWeight: 600 }}>{title}</div>
        <div
          style={{
            fontSize: "0.75rem",
            color: "var(--text-muted)",
          }}
        >
          {desc}
        </div>
      </div>

      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{ width: "24px", height: "24px", cursor: "pointer" }}
      />
    </div>
  );
}

function ShopTextInput({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: any;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <div>
      <div style={{ fontSize: "0.7rem", marginBottom: "0.3rem" }}>{label}</div>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={inputStyle}
      />
    </div>
  );
}

function ShopItemCard({
  item,
  saving,
  saved,
  onChange,
  onSave,
  onDelete,
}: {
  item: ShopItem;
  saving: string | null;
  saved: string | null;
  onChange: (id: string, field: keyof ShopItem, value: any) => void;
  onSave: (item: ShopItem) => void;
  onDelete: () => void;
}) {
  return (
    <div
      className="admin-shop-item-card"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "14px",
        padding: "1rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.85rem",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: "0.75rem",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontWeight: 800,
              fontSize: "1rem",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {item.itemName || "Untitled Item"}
          </div>

          <div
            style={{
              color: "var(--text-muted)",
              fontSize: "0.75rem",
              marginTop: "0.2rem",
            }}
          >
            {item.itemType} · {item.section || "General"}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: "0.4rem",
            flexShrink: 0,
          }}
        >
          {item.showNewTag && (
            <span
              style={{
                background: "var(--blue)",
                color: "#fff",
                fontSize: "0.62rem",
                fontWeight: 900,
                padding: "0.22rem 0.45rem",
                borderRadius: "999px",
              }}
            >
              NEW
            </span>
          )}

          {item.showLeavingTodayTag && (
            <span
              style={{
                background: "#0f0d1b",
                color: "var(--accent)",
                border: "1px solid rgba(255,193,7,0.3)",
                fontSize: "0.62rem",
                fontWeight: 900,
                padding: "0.22rem 0.45rem",
                borderRadius: "999px",
              }}
            >
              LEAVING
            </span>
          )}
        </div>
      </div>

      <div
        className="admin-shop-item-fields"
        style={{
          display: "grid",
          gridTemplateColumns: "1.4fr 1fr 0.7fr",
          gap: "0.65rem",
        }}
      >
        <div>
          <div style={smallLabelStyle}>Name</div>
          <input
            value={item.itemName || ""}
            onChange={(e) => onChange(item.id, "itemName", e.target.value)}
            style={inputStyle}
          />
        </div>

        <div>
          <div style={smallLabelStyle}>Type</div>
          <select
            value={item.itemType}
            onChange={(e) =>
              onChange(
                item.id,
                "itemType",
                e.target.value as ShopItem["itemType"]
              )
            }
            style={inputStyle}
          >
            <option value="avatar">Avatar</option>
            <option value="banner">Banner</option>
            <option value="song">Song</option>
            <option value="title">Title</option>
          </select>
        </div>

        <div>
          <div style={smallLabelStyle}>Price</div>
          <input
            type="number"
            value={item.price || 0}
            onChange={(e) => onChange(item.id, "price", Number(e.target.value))}
            style={inputStyle}
          />
        </div>
      </div>

      <div
        className="admin-shop-item-pair"
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "0.65rem",
        }}
      >
        <div>
          <div style={smallLabelStyle}>Section</div>
          <input
            value={item.section || ""}
            onChange={(e) => onChange(item.id, "section", e.target.value)}
            style={inputStyle}
          />
        </div>

        <div>
          <div style={smallLabelStyle}>Rarity</div>
          <input
            value={item.rarity || ""}
            onChange={(e) => onChange(item.id, "rarity", e.target.value)}
            style={inputStyle}
          />
        </div>
      </div>

      <div
        className="admin-shop-item-pair"
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "0.65rem",
        }}
      >
        <div>
          <div style={smallLabelStyle}>Image URL</div>
          <input
            value={item.previewImage || ""}
            onChange={(e) => onChange(item.id, "previewImage", e.target.value)}
            style={inputStyle}
          />
        </div>

        <div>
          <div style={smallLabelStyle}>Song URL</div>
          <input
            value={item.songUrl || ""}
            onChange={(e) => onChange(item.id, "songUrl", e.target.value)}
            style={inputStyle}
          />
        </div>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "0.75rem",
          flexWrap: "wrap",
          borderTop: "1px solid var(--border)",
          paddingTop: "0.85rem",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: "0.85rem",
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <label style={toggleLabelStyle}>
            <input
              type="checkbox"
              checked={!!item.showNewTag}
              onChange={(e) =>
                onChange(item.id, "showNewTag", e.target.checked)
              }
            />
            NEW
          </label>

          <label style={toggleLabelStyle}>
            <input
              type="checkbox"
              checked={!!item.showLeavingTodayTag}
              onChange={(e) =>
                onChange(item.id, "showLeavingTodayTag", e.target.checked)
              }
            />
            LEAVING
          </label>

          <label style={toggleLabelStyle}>
            <input
              type="checkbox"
              checked={!!item.isVisible}
              onChange={(e) => onChange(item.id, "isVisible", e.target.checked)}
            />
            Visible
          </label>
        </div>

        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            onClick={() => onSave(item)}
            disabled={saving === item.id}
            style={{
              background: saved === item.id ? "var(--green)" : "var(--accent)",
              color: "#000",
              border: "none",
              borderRadius: "8px",
              padding: "0.5rem 0.9rem",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            {saving === item.id
              ? "Saving..."
              : saved === item.id
              ? "Saved"
              : "Save"}
          </button>

          <button
            onClick={onDelete}
            style={{
              background: "transparent",
              border: "1px solid var(--border)",
              color: "var(--red)",
              borderRadius: "8px",
              padding: "0.5rem 0.75rem",
              cursor: "pointer",
              fontWeight: 800,
            }}
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}

function LimitedCardFields({
  card,
  players,
  onChange,
}: {
  card: Partial<LimitedCard>;
  players: Player[];
  onChange: (patch: Partial<LimitedCard>) => void;
}) {
  const linkedPlayer = players.find((p) => p.id === card.playerId);
  const statOptions = limitedCardStatOptions(linkedPlayer?.game);
  const statValues = statOptions.map((option) => option.value);
  const currentStat = String(card.boostStat || "");
  const showCurrentStat = currentStat && !statValues.includes(currentStat);

  return (
    <div>
      <div
        className="admin-shop-form-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "0.85rem",
          marginBottom: "0.85rem",
        }}
      >
        <ShopTextInput
          label="Card Name"
          value={card.cardName || ""}
          onChange={(value) => onChange({ cardName: value })}
        />

        <div>
          <div style={{ fontSize: "0.7rem", marginBottom: "0.3rem" }}>
            Linked Player
          </div>
          <select
            value={card.playerId || ""}
            onChange={(e) => {
              const playerId = e.target.value;
              const player = players.find((p) => p.id === playerId);
              const nextStatValues = limitedCardStatOptions(
                player?.game
              ).map((option) => option.value);
              const patch: Partial<LimitedCard> = { playerId };

              if (
                card.boostStat &&
                !nextStatValues.includes(String(card.boostStat))
              ) {
                patch.boostStat = nextStatValues.includes("kills")
                  ? "kills"
                  : nextStatValues[0] || "kills";
              }

              onChange(patch);
            }}
            style={inputStyle}
          >
            <option value="">Choose player</option>
            {players.map((player) => (
              <option key={player.id} value={player.id}>
                {player.name} · {player.game}
              </option>
            ))}
          </select>
        </div>

        <div>
          <div style={{ fontSize: "0.7rem", marginBottom: "0.3rem" }}>
            Rarity
          </div>
          <select
            value={card.rarity || "rare"}
            onChange={(e) => onChange({ rarity: e.target.value })}
            style={inputStyle}
          >
            {LIMITED_CARD_RARITIES.map((rarity) => (
              <option key={rarity} value={rarity}>
                {rarity}
              </option>
            ))}
          </select>
        </div>

        <div>
          <div style={{ fontSize: "0.7rem", marginBottom: "0.3rem" }}>
            Boost Stat
          </div>
          <select
            value={currentStat || statValues[0] || "kills"}
            onChange={(e) => onChange({ boostStat: e.target.value })}
            style={inputStyle}
          >
            {showCurrentStat && (
              <option value={currentStat}>
                {limitedCardStatLabel(currentStat)} (other game)
              </option>
            )}
            {statOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <ShopTextInput
          label="Boost Multiplier (×)"
          type="number"
          value={card.boostValue ?? 1.5}
          onChange={(value) => onChange({ boostValue: Number(value) })}
        />

        <ShopTextInput
          label="Shop Price (coins)"
          type="number"
          value={card.shopPrice ?? 0}
          onChange={(value) => onChange({ shopPrice: Number(value) })}
        />

        <ShopTextInput
          label="Transfers Price (m)"
          type="number"
          value={card.transferPrice ?? 0}
          onChange={(value) => onChange({ transferPrice: Number(value) })}
        />

        <ShopTextInput
          label="Stock (copies left)"
          type="number"
          value={card.stock ?? 1}
          onChange={(value) => onChange({ stock: Number(value) })}
        />
      </div>

      <div
        className="admin-shop-url-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: "0.85rem",
          marginBottom: "0.85rem",
        }}
      >
        <ShopTextInput
          label="Power-up Text (optional override)"
          value={card.powerupText || ""}
          onChange={(value) => onChange({ powerupText: value })}
        />

        <ShopTextInput
          label="Image URL"
          value={card.image || ""}
          onChange={(value) => onChange({ image: value })}
        />

        <div>
          <div style={{ fontSize: "0.7rem", marginBottom: "0.3rem" }}>
            Accent Color
          </div>
          <input
            type="color"
            value={
              card.accentColor || getLimitedCardRarityColor(card.rarity)
            }
            onChange={(e) => onChange({ accentColor: e.target.value })}
            style={{
              ...inputStyle,
              padding: "0.3rem",
              height: "38px",
              cursor: "pointer",
            }}
          />
        </div>
      </div>
    </div>
  );
}

function LimitedCardPreview({
  card,
  players,
}: {
  card: Partial<LimitedCard>;
  players: Player[];
}) {
  const rarityColor = getLimitedCardRarityColor(card.rarity, card.accentColor);
  const linkedPlayer = players.find((p) => p.id === card.playerId);
  const imageUrl = getLimitedCardImageUrl(card.image);

  return (
    <div
      style={{
        width: "100%",
        borderRadius: "16px",
        overflow: "hidden",
        border: `1px solid ${rarityColor}66`,
        background: `linear-gradient(160deg, ${rarityColor}26, rgba(255,255,255,0.02)), var(--surface)`,
        boxShadow: `0 12px 32px ${rarityColor}1f`,
      }}
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          aspectRatio: "4/3",
          background: `radial-gradient(circle at 30% 20%, ${rarityColor}33, transparent 45%), #111`,
        }}
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={card.cardName || "Mastery card"}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
            }}
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "rgba(255,255,255,0.25)",
              fontWeight: 900,
              fontSize: "1.8rem",
            }}
          >
            {(card.cardName || "?").slice(0, 1)}
          </div>
        )}

        <span
          style={{
            position: "absolute",
            top: "0.55rem",
            left: "0.55rem",
            background: "rgba(0,0,0,0.55)",
            border: `1px solid ${rarityColor}80`,
            color: rarityColor,
            fontSize: "0.58rem",
            fontWeight: 900,
            padding: "0.2rem 0.45rem",
            borderRadius: "999px",
            textTransform: "uppercase",
            letterSpacing: "0.6px",
          }}
        >
          {card.rarity || "rare"}
        </span>
      </div>

      <div style={{ padding: "0.7rem" }}>
        <div
          style={{
            fontWeight: 900,
            fontSize: "0.9rem",
            lineHeight: 1.2,
            marginBottom: "0.3rem",
          }}
        >
          {card.cardName || "Untitled Card"}
        </div>

        <div
          style={{
            color: "var(--text-muted)",
            fontSize: "0.68rem",
            marginBottom: "0.4rem",
          }}
        >
          {linkedPlayer
            ? `${linkedPlayer.name} · ${linkedPlayer.game}`
            : "No player linked"}
        </div>

        <div
          style={{
            color: "var(--accent)",
            fontSize: "0.68rem",
            fontWeight: 800,
            lineHeight: 1.35,
            minHeight: "2rem",
            marginBottom: "0.5rem",
          }}
        >
          {limitedCardPowerupText({
            boostStat: card.boostStat,
            boostValue: card.boostValue,
            powerupText: card.powerupText,
          })}
        </div>

        <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
          <span
            style={{
              background: "rgba(255,193,7,0.1)",
              border: "1px solid rgba(255,193,7,0.25)",
              color: "var(--accent)",
              fontSize: "0.62rem",
              fontWeight: 900,
              padding: "0.22rem 0.45rem",
              borderRadius: "999px",
            }}
          >
            {Number(card.shopPrice || 0).toLocaleString()} coins
          </span>

          <span
            style={{
              background: "rgba(3,71,244,0.12)",
              border: "1px solid rgba(107,159,255,0.35)",
              color: "#8bb5ff",
              fontSize: "0.62rem",
              fontWeight: 900,
              padding: "0.22rem 0.45rem",
              borderRadius: "999px",
            }}
          >
            +{Number(card.transferPrice || 0).toFixed(1)}m squad cost
          </span>
        </div>
      </div>
    </div>
  );
}

function LimitedCardEditor({
  card,
  players,
  saving,
  saved,
  onChange,
  onSave,
  onDelete,
}: {
  card: LimitedCard;
  players: Player[];
  saving: string | null;
  saved: string | null;
  onChange: (id: string, patch: Partial<LimitedCard>) => void;
  onSave: (card: LimitedCard) => void;
  onDelete: () => void;
}) {
  return (
    <div
      className="admin-shop-item-card"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "14px",
        padding: "1rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.85rem",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: "0.75rem",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontWeight: 800,
              fontSize: "1rem",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {card.cardName || "Untitled Card"}
          </div>

          <div
            style={{
              color: "var(--text-muted)",
              fontSize: "0.75rem",
              marginTop: "0.2rem",
            }}
          >
            {card.rarity || "rare"} · stock {Number(card.stock || 0)}
            {card.isVisible === false ? " · hidden" : ""}
          </div>
        </div>

        <div style={{ display: "flex", gap: "0.4rem", flexShrink: 0 }}>
          {card.showNewTag && (
            <span
              style={{
                background: "var(--blue)",
                color: "#fff",
                fontSize: "0.62rem",
                fontWeight: 900,
                padding: "0.22rem 0.45rem",
                borderRadius: "999px",
              }}
            >
              NEW
            </span>
          )}

          {card.showLeavingTodayTag && (
            <span
              style={{
                background: "#0f0d1b",
                color: "var(--accent)",
                border: "1px solid rgba(255,193,7,0.3)",
                fontSize: "0.62rem",
                fontWeight: 900,
                padding: "0.22rem 0.45rem",
                borderRadius: "999px",
              }}
            >
              LEAVING
            </span>
          )}
        </div>
      </div>

      <div style={{ display: "grid", justifyItems: "center" }}>
        <div style={{ width: "min(100%, 190px)" }}>
          <LimitedCardPreview card={card} players={players} />
        </div>
      </div>

      <LimitedCardFields
        card={card}
        players={players}
        onChange={(patch) => onChange(card.id, patch)}
      />

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "0.75rem",
          flexWrap: "wrap",
          borderTop: "1px solid var(--border)",
          paddingTop: "0.85rem",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: "0.85rem",
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <label style={toggleLabelStyle}>
            <input
              type="checkbox"
              checked={!!card.showNewTag}
              onChange={(e) =>
                onChange(card.id, { showNewTag: e.target.checked })
              }
            />
            NEW
          </label>

          <label style={toggleLabelStyle}>
            <input
              type="checkbox"
              checked={!!card.showLeavingTodayTag}
              onChange={(e) =>
                onChange(card.id, { showLeavingTodayTag: e.target.checked })
              }
            />
            LEAVING
          </label>

          <label style={toggleLabelStyle}>
            <input
              type="checkbox"
              checked={card.isVisible !== false}
              onChange={(e) =>
                onChange(card.id, { isVisible: e.target.checked })
              }
            />
            Visible
          </label>
        </div>

        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            onClick={() => onSave(card)}
            disabled={saving === card.id}
            style={{
              background: saved === card.id ? "var(--green)" : "var(--accent)",
              color: "#000",
              border: "none",
              borderRadius: "8px",
              padding: "0.5rem 0.9rem",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            {saving === card.id
              ? "Saving..."
              : saved === card.id
              ? "Saved"
              : "Save"}
          </button>

          <button
            onClick={onDelete}
            style={{
              background: "transparent",
              border: "1px solid var(--border)",
              color: "var(--red)",
              borderRadius: "8px",
              padding: "0.5rem 0.75rem",
              cursor: "pointer",
              fontWeight: 800,
            }}
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}

function StatInput({
  label,
  id,
  val,
  set,
}: {
  label: string;
  id: string;
  val: any;
  set: any;
}) {
  return (
    <div>
      <div
        style={{
          fontSize: "0.75rem",
          color: "var(--text-muted)",
          marginBottom: "0.3rem",
        }}
      >
        {label}
      </div>

      <input
        type="number"
        value={val[id] || ""}
        onChange={(e) => set({ ...val, [id]: e.target.value })}
        style={{
          width: "100%",
          background: "var(--bg)",
          border: "1px solid var(--border)",
          color: "#fff",
          padding: "0.5rem",
          borderRadius: "6px",
        }}
      />
    </div>
  );
}

const inputStyle = {
  width: "100%",
  background: "var(--bg)",
  border: "1px solid var(--border)",
  color: "#fff",
  padding: "0.5rem",
  borderRadius: "6px",
  fontSize: "0.85rem",
};

const labelStyle = {
  fontSize: "0.8rem",
  color: "var(--text-muted)",
  marginBottom: "0.4rem",
};

const smallLabelStyle = {
  fontSize: "0.68rem",
  marginBottom: "0.25rem",
};

const sectionTitleStyle = {
  fontSize: "1.2rem",
  fontWeight: 700,
  marginBottom: "1.5rem",
};

const panelStyle = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: "12px",
  padding: "1.5rem",
  display: "flex",
  flexDirection: "column" as const,
  gap: "1.5rem",
};

const toggleLabelStyle = {
  display: "flex",
  alignItems: "center",
  gap: "0.4rem",
  fontSize: "0.75rem",
  color: "var(--text-muted)",
};

const smallButtonStyle = {
  background: "var(--bg)",
  border: "1px solid var(--border)",
  color: "#fff",
  width: "40px",
  height: "40px",
  borderRadius: "8px",
  cursor: "pointer",
  fontSize: "1.2rem",
};

const secondaryButtonStyle = {
  background: "transparent",
  border: "1px solid var(--border)",
  color: "var(--text-muted)",
  borderRadius: "8px",
  padding: "0.55rem 0.75rem",
  fontWeight: 800,
  cursor: "pointer",
};

const primaryButtonStyle = (isSaved: boolean) => ({
  background: isSaved ? "var(--green)" : "var(--blue)",
  color: "#fff",
  border: "none",
  padding: "0.8rem",
  borderRadius: "8px",
  fontWeight: 700,
  cursor: "pointer",
});
        {tab === "cards" && (
          <div>
            <h2 style={sectionTitleStyle}>Mastery Cards</h2>

            <div
              style={{
                background:
                  "linear-gradient(135deg, rgba(155,248,0,0.08), rgba(3,71,244,0.1)), var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "14px",
                padding: "1rem",
                marginBottom: "1rem",
                color: "var(--text-muted)",
                fontSize: "0.85rem",
                lineHeight: 1.6,
              }}
            >
              Design boost cards that managers buy in the shop with coins and
              field from the player market on the transfers page — the
              special version replaces the player&apos;s normal card in the
              squad. Each card multiplies one stat&apos;s points for that
              player, its transfers price replaces the player&apos;s price in
              the squad budget, and the copy is consumed once the gameweek it
              was used in is scored. Only one version of a player can be
              fielded at a time.
            </div>

            <div
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "14px",
                padding: "1.25rem",
                marginBottom: "2rem",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "1rem",
                  marginBottom: "1rem",
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <div style={{ fontWeight: 800, fontSize: "1rem" }}>
                    Create Mastery Card
                  </div>
                  <div
                    style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}
                  >
                    Pick the player, the stat, and the multiplier.
                  </div>
                </div>

                <button
                  onClick={handleAddLimitedCard}
                  disabled={saving === "newLimitedCard"}
                  style={primaryButtonStyle(saved === "newLimitedCard")}
                >
                  {saving === "newLimitedCard"
                    ? "Adding..."
                    : saved === "newLimitedCard"
                    ? "Added"
                    : "Add Card"}
                </button>
              </div>

              <LimitedCardFields
                card={newCard}
                players={players}
                onChange={(patch) => setNewCard({ ...newCard, ...patch })}
              />
            </div>

            {limitedCards.length === 0 ? (
              <div
                style={{
                  border: "1px dashed var(--border)",
                  borderRadius: "12px",
                  padding: "2rem 1rem",
                  textAlign: "center",
                  color: "var(--text-muted)",
                }}
              >
                No mastery cards yet. Create the first one above.
              </div>
            ) : (
              <div
                className="admin-shop-grid"
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))",
                  gap: "1rem",
                }}
              >
                {limitedCards.map((card) => (
                  <LimitedCardEditor
                    key={card.id}
                    card={card}
                    players={players}
                    saving={saving}
                    saved={saved}
                    onChange={updateLimitedCardPatch}
                    onSave={handleUpdateLimitedCard}
                    onDelete={() => {
                      if (confirm(`Delete "${card.cardName || "card"}"?`)) {
                        deleteDoc(doc(db, "limitedCards", card.id)).then(() =>
                          setLimitedCards(
                            limitedCards.filter((c) => c.id !== card.id)
                          )
                        );
                      }
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "fixtures" && (
          <div style={{ display: "grid", gap: "1rem", maxWidth: "1100px" }}>
            <div
              style={{
                background:
                  "linear-gradient(135deg, rgba(3,71,244,0.12), rgba(255,193,7,0.08)), var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "14px",
                padding: "1rem",
              }}
            >
              <h2 style={{ ...sectionTitleStyle, marginBottom: "0.5rem" }}>
                Player Fixtures
              </h2>
              <p style={{ color: "var(--text-muted)", lineHeight: 1.6 }}>
                Pair esports players for each gameweek. The Fixtures page
                compares their saved gameweek scores automatically: win = 3
                PTS, draw = 1 PTS, loss = 0 PTS.
              </p>
            </div>

            <section style={panelStyle}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
                  gap: "0.75rem",
                  alignItems: "end",
                }}
              >
                <div>
                  <div style={labelStyle}>Gameweek</div>
                  <input
                    type="number"
                    min="1"
                    value={fixtureGameweek}
                    onChange={(event) =>
                      setFixtureGameweek(
                        Math.max(1, Number(event.target.value) || 1)
                      )
                    }
                    style={inputStyle}
                  />
                </div>

                <div>
                  <div style={labelStyle}>Player One</div>
                  <select
                    value={newFixturePlayerOne}
                    onChange={(event) => setNewFixturePlayerOne(event.target.value)}
                    style={inputStyle}
                  >
                    <option value="">Choose player</option>
                    {players.map((player) => (
                      <option key={player.id} value={player.id}>
                        {player.name} · {player.game}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div style={labelStyle}>Player Two</div>
                  <select
                    value={newFixturePlayerTwo}
                    onChange={(event) => setNewFixturePlayerTwo(event.target.value)}
                    style={inputStyle}
                  >
                    <option value="">Choose player</option>
                    {players.map((player) => (
                      <option key={player.id} value={player.id}>
                        {player.name} · {player.game}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={handleAddFixture}
                  disabled={saving === "newFixture"}
                  style={{
                    background:
                      saved === "newFixture" ? "var(--green)" : "var(--accent)",
                    color: "#000",
                    border: "none",
                    borderRadius: "8px",
                    padding: "0.65rem 1rem",
                    minHeight: "38px",
                    fontWeight: 900,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  {saving === "newFixture"
                    ? "Adding..."
                    : saved === "newFixture"
                    ? "Added"
                    : "Add Fixture"}
                </button>
              </div>
            </section>

            <section style={panelStyle}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "1rem",
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <h2 style={{ ...sectionTitleStyle, marginBottom: "0.3rem" }}>
                    GW{fixtureGameweek} Fixtures
                  </h2>
                  <p style={{ color: "var(--text-muted)", fontSize: "0.82rem" }}>
                    Edit either player, move a fixture to another gameweek, or
                    remove it.
                  </p>
                </div>
                <div
                  style={{
                    color: "var(--text-muted)",
                    fontSize: "0.8rem",
                    fontWeight: 800,
                  }}
                >
                  {selectedFixtures.length} fixture
                  {selectedFixtures.length === 1 ? "" : "s"}
                </div>
              </div>

              {selectedFixtures.length === 0 ? (
                <div
                  style={{
                    border: "1px dashed var(--border)",
                    borderRadius: "12px",
                    padding: "2rem 1rem",
                    textAlign: "center",
                    color: "var(--text-muted)",
                  }}
                >
                  No fixtures are scheduled for GW{fixtureGameweek} yet.
                </div>
              ) : (
                <div style={{ display: "grid", gap: "0.75rem" }}>
                  {selectedFixtures.map((fixture) => (
                    <div
                      key={fixture.id}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(175px, 1fr))",
                        gap: "0.65rem",
                        alignItems: "end",
                        padding: "0.85rem",
                        border: "1px solid var(--border)",
                        borderRadius: "12px",
                        background: "rgba(255,255,255,0.025)",
                      }}
                    >
                      <div>
                        <div style={smallLabelStyle}>Gameweek</div>
                        <input
                          type="number"
                          min="1"
                          value={fixture.gameweek}
                          onChange={(event) =>
                            updateFixtureField(
                              fixture.id,
                              "gameweek",
                              Math.max(1, Number(event.target.value) || 1)
                            )
                          }
                          style={inputStyle}
                        />
                      </div>

                      <div>
                        <div style={smallLabelStyle}>Player One</div>
                        <select
                          value={fixture.playerOneId}
                          onChange={(event) =>
                            updateFixtureField(
                              fixture.id,
                              "playerOneId",
                              event.target.value
                            )
                          }
                          style={inputStyle}
                        >
                          <option value="">Choose player</option>
                          {players.map((player) => (
                            <option key={player.id} value={player.id}>
                              {player.name} · {player.game}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <div style={smallLabelStyle}>Player Two</div>
                        <select
                          value={fixture.playerTwoId}
                          onChange={(event) =>
                            updateFixtureField(
                              fixture.id,
                              "playerTwoId",
                              event.target.value
                            )
                          }
                          style={inputStyle}
                        >
                          <option value="">Choose player</option>
                          {players.map((player) => (
                            <option key={player.id} value={player.id}>
                              {player.name} · {player.game}
                            </option>
                          ))}
                        </select>
                      </div>

                      <button
                        onClick={() => handleSaveFixture(fixture)}
                        disabled={saving === fixture.id}
                        style={{
                          background:
                            saved === fixture.id ? "var(--green)" : "var(--accent)",
                          color: "#000",
                          border: "none",
                          borderRadius: "8px",
                          padding: "0.6rem 0.85rem",
                          fontWeight: 900,
                          cursor: "pointer",
                        }}
                      >
                        {saving === fixture.id
                          ? "Saving..."
                          : saved === fixture.id
                          ? "Saved"
                          : "Save"}
                      </button>

                      <button
                        onClick={() => handleDeleteFixture(fixture)}
                        disabled={saving === fixture.id}
                        title={`Delete ${playerLabel(fixture.playerOneId)} vs ${playerLabel(fixture.playerTwoId)}`}
                        style={{
                          background: "transparent",
                          color: "var(--red)",
                          border: "1px solid var(--border)",
                          borderRadius: "8px",
                          padding: "0.6rem 0.75rem",
                          fontWeight: 900,
                          cursor: "pointer",
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {tab === "stats" && (
          <div
            className="admin-stats-layout"
            style={{
              display: "grid",
              gridTemplateColumns: "300px 1fr",
              gap: "2rem",
            }}
          >
            <div
              style={{
                background: "var(--surface)",
                borderRadius: "12px",
                border: "1px solid var(--border)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  padding: "1rem",
                  borderBottom: "1px solid var(--border)",
                  fontWeight: 700,
                }}
              >
                Select Player
              </div>

              <div className="admin-player-selector" style={{ maxHeight: "600px", overflowY: "auto" }}>
                {players.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => setSelectedPlayerId(p.id)}
                    style={{
                      padding: "0.75rem 1rem",
                      cursor: "pointer",
                      borderBottom: "1px solid var(--border)",
                      background:
                        selectedPlayerId === p.id
                          ? "rgba(3,71,244,0.15)"
                          : "transparent",
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>
                      {p.name}
                    </div>
                    <div
                      style={{
                        fontSize: "0.7rem",
                        color: "var(--text-muted)",
                      }}
                    >
                      {p.game}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div
              style={{
                background: "var(--surface)",
                borderRadius: "12px",
                border: "1px solid var(--border)",
                padding: "1.5rem",
              }}
            >
              {activePlayer ? (
                <div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "1.5rem",
                    }}
                  >
                    <div>
                      <h2 style={{ fontSize: "1.25rem", fontWeight: 700 }}>
                        {activePlayer.name}
                      </h2>
                      <p style={{ color: "var(--accent)", fontSize: "0.8rem" }}>
                        GW{settings?.currentGameweek} Rules
                      </p>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <div
                        style={{
                          fontSize: "0.7rem",
                          color: "var(--text-muted)",
                        }}
                      >
                        CALCULATED GW POINTS
                      </div>
                      <div
                        style={{
                          fontSize: "2rem",
                          fontWeight: 800,
                          color: "var(--accent)",
                        }}
                      >
                        {calculatePoints(activePlayer)}
                      </div>
                    </div>
                  </div>

                  <div
                    className="admin-stats-grid"
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(3, 1fr)",
                      gap: "1rem",
                    }}
                  >
                    {["matchWin", "matchLose", "mvp", "svp", "bonus"].map(
                      (f) => (
                        <StatInput
                          key={f}
                          label={f.replace(/([A-Z])/g, " $1").trim()}
                          id={f}
                          val={calcStats}
                          set={setCalcStats}
                        />
                      )
                    )}

                    <div
                      style={{
                        gridColumn: "1/-1",
                        borderTop: "1px solid var(--border)",
                        margin: "0.5rem 0",
                      }}
                    />

                    {activePlayer.game === "Valorant"
                      ? [
                          "kills",
                          "assists",
                          "deaths",
                          "firstBlood",
                          "firstDeath",
                          "tripleKill",
                          "quadraKill",
                          "ace",
                          "clutch",
                        ].map((f) => (
                          <StatInput
                            key={f}
                            label={f.replace(/([A-Z])/g, " $1").trim()}
                            id={f}
                            val={calcStats}
                            set={setCalcStats}
                          />
                        ))
                      : [
                          "kills",
                          "assists",
                          "deaths",
                          "lastKills",
                          "headKill",
                          "healing",
                          "damage",
                          "blocked",
                          "soloKills",
                        ].map((f) => (
                          <StatInput
                            key={f}
                            label={f.replace(/([A-Z])/g, " $1").trim()}
                            id={f}
                            val={calcStats}
                            set={setCalcStats}
                          />
                        ))}
                  </div>

                  <button
                    onClick={handleSaveStats}
                    disabled={saving === "matchstats"}
                    style={{
                      width: "100%",
                      marginTop: "2rem",
                      background:
                        saved === "matchstats"
                          ? "var(--green)"
                          : "var(--blue)",
                      color: "#fff",
                      border: "none",
                      padding: "1rem",
                      borderRadius: "8px",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    {saving === "matchstats"
                      ? "Saving..."
                      : saved === "matchstats"
                      ? "✓ Saved Success!"
                      : "Save Match Stats"}
                  </button>
                </div>
              ) : (
                <div
                  style={{
                    height: "400px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--text-muted)",
                  }}
                >
                  Select a player to start.
                </div>
              )}
            </div>
          </div>
        )}

        {tab === "managers" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid var(--border)",
                borderRadius: "10px",
                padding: "1rem",
                color: "var(--text-muted)",
                fontSize: "0.85rem",
              }}
            >
              Showing current GW points from{" "}
              <strong style={{ color: "#fff" }}>gameweekTeams.gwPoints</strong>
              {settings?.currentGameweek ? (
                <>
                  {" "}for{" "}
                  <strong style={{ color: "#fff" }}>
                    GW{settings.currentGameweek}
                  </strong>
                </>
              ) : null}
              .
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "1rem",
                flexWrap: "wrap",
                background:
                  "linear-gradient(135deg, rgba(3,71,244,0.12), rgba(255,193,7,0.08)), var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "10px",
                padding: "1rem",
              }}
            >
              <div>
                <div style={{ fontWeight: 800, marginBottom: "0.25rem" }}>
                  Grant Ranking Coins
                </div>

                <div style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>
                  Rewards managers based on their current GW points rank:
                  1st 4,000¢ · 2nd 3,000¢ · 3rd 2,500¢ · 4th 1,500¢ ·
                  5th or more 1,000¢
                </div>
              </div>

              <button
                onClick={handleGrantRankingCoins}
                disabled={saving === "grantRankingCoins"}
                style={{
                  background:
                    saved === "grantRankingCoins"
                      ? "var(--green)"
                      : "var(--blue)",
                  color: "#fff",
                  border: "none",
                  borderRadius: "8px",
                  padding: "0.75rem 1rem",
                  fontWeight: 900,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {saving === "grantRankingCoins"
                  ? "Granting..."
                  : saved === "grantRankingCoins"
                  ? "Granted"
                  : "Grant Coins"}
              </button>
            </div>

            {managers.map((m) => (
              <div
                key={m.id}
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: "10px",
                  padding: "1rem",
                }}
              >
                <div
                  style={{
                    fontWeight: 700,
                    marginBottom: "1rem",
                    fontSize: "1.1rem",
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "1rem",
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <span>{m.manager || "Unknown Manager"}</span>

                    {m.lastGwCoinsEarned !== undefined &&
                      Number(m.lastGwCoinsEarned || 0) > 0 && (
                        <span
                          style={{
                            marginLeft: "0.5rem",
                            fontSize: "0.75rem",
                            color: "var(--accent)",
                            fontWeight: 700,
                          }}
                        >
                          Last Coins: {m.lastGwCoinsEarned}¢
                          {m.lastGwCoinsGameweek
                            ? ` · GW${m.lastGwCoinsGameweek}`
                            : ""}
                        </span>
                      )}
                  </div>

                  <span
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--text-muted)",
                      fontWeight: 500,
                    }}
                  >
                    {m.ownerEmail}
                  </span>
                </div>

                <div
                  className="admin-manager-inputs"
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(6, minmax(100px, 1fr)) 100px",
                    gap: "0.75rem",
                    alignItems: "end",
                    overflowX: "auto",
                  }}
                >
                  <div>
                    <div style={{ fontSize: "0.7rem" }}>Total Points</div>
                    <input
                      type="number"
                      value={m.totalPoints ?? 0}
                      onChange={(e) =>
                        updateManagerField(
                          m.id,
                          "totalPoints",
                          Number(e.target.value)
                        )
                      }
                      style={inputStyle}
                    />
                  </div>

                  <div>
                    <div style={{ fontSize: "0.7rem" }}>
                      GW Points
                      {settings?.currentGameweek
                        ? ` - GW${settings.currentGameweek}`
                        : ""}
                    </div>
                    <input
                      type="number"
                      value={m.gameweekPoints ?? 0}
                      onChange={(e) =>
                        updateManagerField(
                          m.id,
                          "gameweekPoints",
                          Number(e.target.value)
                        )
                      }
                      style={inputStyle}
                    />
                  </div>

                  <div>
                    <div style={{ fontSize: "0.7rem" }}>Coins</div>
                    <input
                      type="number"
                      value={m.coins ?? 0}
                      onChange={(e) =>
                        updateManagerField(m.id, "coins", Number(e.target.value))
                      }
                      style={inputStyle}
                    />
                  </div>

                  <div>
                    <div style={{ fontSize: "0.7rem" }}>Bank</div>
                    <input
                      type="number"
                      step="0.1"
                      value={m.Bank ?? 0}
                      onChange={(e) =>
                        updateManagerField(m.id, "Bank", Number(e.target.value))
                      }
                      style={inputStyle}
                    />
                  </div>

                  <div>
                    <div style={{ fontSize: "0.7rem" }}>Free Trans</div>
                    <input
                      type="number"
                      value={m.freeTransfers ?? 0}
                      onChange={(e) =>
                        updateManagerField(
                          m.id,
                          "freeTransfers",
                          Number(e.target.value)
                        )
                      }
                      style={inputStyle}
                    />
                  </div>

                  <label
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.45rem",
                      fontSize: "0.7rem",
                    }}
                  >
                    Leaderboard
                    <span
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.45rem",
                        minHeight: "38px",
                        color:
                          m.showInLeaderboard !== false
                            ? "var(--green)"
                            : "var(--text-muted)",
                        fontSize: "0.8rem",
                        fontWeight: 700,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={m.showInLeaderboard !== false}
                        onChange={(e) =>
                          updateManagerField(
                            m.id,
                            "showInLeaderboard",
                            e.target.checked
                          )
                        }
                        style={{
                          width: "18px",
                          height: "18px",
                          accentColor: "var(--blue)",
                        }}
                      />
                      {m.showInLeaderboard !== false ? "Shown" : "Hidden"}
                    </span>
                  </label>

                  <button
                    onClick={() => handleSaveManager(m)}
                    disabled={saving === m.id}
                    style={{
                      background:
                        saved === m.id ? "var(--green)" : "var(--accent)",
                      color: "#000",
                      border: "none",
                      borderRadius: "6px",
                      padding: "0.6rem",
                      fontWeight: 700,
                      cursor: "pointer",
                      width: "100%",
                    }}
                  >
                    {saving === m.id
                      ? "Saving..."
                      : saved === m.id
                      ? "Saved"
                      : "Save"}
                  </button>
                </div>

                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    gap: "0.5rem",
                    marginTop: "0.85rem",
                  }}
                >
                  <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                    Titles:
                  </div>

                  {(m.titles || []).length === 0 && (
                    <div
                      style={{
                        fontSize: "0.75rem",
                        color: "var(--text-muted)",
                      }}
                    >
                      None yet
                    </div>
                  )}

                  {(m.titles || []).map((title) => (
                    <span
                      key={title}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.4rem",
                        background: "rgba(255,193,7,0.08)",
                        border: "1px solid rgba(255,193,7,0.35)",
                        color: "var(--accent)",
                        borderRadius: "999px",
                        padding: "0.3rem 0.3rem 0.3rem 0.7rem",
                        fontSize: "0.75rem",
                        fontWeight: 800,
                      }}
                    >
                      🏆 {title}
                      <button
                        type="button"
                        onClick={() =>
                          updateManagerField(
                            m.id,
                            "titles",
                            (m.titles || []).filter((t) => t !== title)
                          )
                        }
                        style={{
                          background: "rgba(0,0,0,0.35)",
                          border: "none",
                          color: "#fff",
                          width: "20px",
                          height: "20px",
                          borderRadius: "999px",
                          cursor: "pointer",
                          fontSize: "0.65rem",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        ✕
                      </button>
                    </span>
                  ))}

                  <input
                    value={titleDrafts[m.id] || ""}
                    onChange={(e) =>
                      setTitleDrafts({ ...titleDrafts, [m.id]: e.target.value })
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") addManagerTitle(m);
                    }}
                    placeholder="New title, e.g. Season 2025 Champion"
                    style={{
                      ...inputStyle,
                      maxWidth: "280px",
                      minHeight: "34px",
                    }}
                  />

                  <button
                    type="button"
                    onClick={() => addManagerTitle(m)}
                    style={secondaryButtonStyle}
                  >
                    Add Title
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "players" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {players.map((p) => (
              <div
                key={p.id}
                className="admin-player-row"
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  padding: "0.75rem 1rem",
                  display: "grid",
                  gridTemplateColumns: "1.5fr 0.7fr 2fr minmax(132px, 0.9fr) auto",
                  gap: "0.75rem",
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={{ fontWeight: 600 }}>{p.name}</div>
                  <div
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--text-muted)",
                    }}
                  >
                    {p.game}
                  </div>
                </div>

                <input
                  type="number"
                  step="0.1"
                  value={p.price}
                  onChange={(e) =>
                    setPlayers((prev) =>
                      prev.map((x) =>
                        x.id === p.id
                          ? { ...x, price: Number(e.target.value) }
                          : x
                      )
                    )
                  }
                  style={inputStyle}
                />

                <input
                  type="text"
                  value={p.desc}
                  onChange={(e) =>
                    setPlayers((prev) =>
                      prev.map((x) =>
                        x.id === p.id ? { ...x, desc: e.target.value } : x
                      )
                    )
                  }
                  style={inputStyle}
                />

                <label
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.45rem",
                    fontSize: "0.7rem",
                  }}
                >
                  Transfers
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.45rem",
                      minHeight: "38px",
                      color:
                        p.showInTransfers !== false
                          ? "var(--green)"
                          : "var(--text-muted)",
                      fontSize: "0.8rem",
                      fontWeight: 700,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={p.showInTransfers !== false}
                      onChange={(e) =>
                        setPlayers((prev) =>
                          prev.map((x) =>
                            x.id === p.id
                              ? { ...x, showInTransfers: e.target.checked }
                              : x
                          )
                        )
                      }
                      style={{
                        width: "18px",
                        height: "18px",
                        accentColor: "var(--blue)",
                      }}
                    />
                    {p.showInTransfers !== false ? "Shown" : "Hidden"}
                  </span>
                </label>

                <button
                  onClick={async () => {
                    setSaving(p.id);

                    try {
                      await updateDoc(doc(db, "players", p.id), {
                        price: p.price,
                        desc: p.desc,
                        showInTransfers: p.showInTransfers !== false,
                      });

                      await syncCurrentGameweekScores();

                      markSaved(p.id);
                    } catch (err) {
                      console.error(err);
                    }

                    setSaving(null);
                  }}
                  disabled={saving === p.id}
                  style={{
                    background:
                      saved === p.id ? "var(--green)" : "var(--accent)",
                    color: "#000",
                    border: "none",
                    borderRadius: "6px",
                    padding: "0.6rem 1.2rem",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  {saving === p.id
                    ? "Saving..."
                    : saved === p.id
                    ? "Saved"
                    : "Save"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </Shell>
  );
}

function LockRow({
  title,
  desc,
  checked,
  onChange,
}: {
  title: string;
  desc: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div
      className="admin-lock-row"
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <div>
        <div style={{ fontWeight: 600 }}>{title}</div>
        <div
          style={{
            fontSize: "0.75rem",
            color: "var(--text-muted)",
          }}
        >
          {desc}
        </div>
      </div>

      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{ width: "24px", height: "24px", cursor: "pointer" }}
      />
    </div>
  );
}

function ShopTextInput({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: any;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <div>
      <div style={{ fontSize: "0.7rem", marginBottom: "0.3rem" }}>{label}</div>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={inputStyle}
      />
    </div>
  );
}

function ShopItemCard({
  item,
  saving,
  saved,
  onChange,
  onSave,
  onDelete,
}: {
  item: ShopItem;
  saving: string | null;
  saved: string | null;
  onChange: (id: string, field: keyof ShopItem, value: any) => void;
  onSave: (item: ShopItem) => void;
  onDelete: () => void;
}) {
  return (
    <div
      className="admin-shop-item-card"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "14px",
        padding: "1rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.85rem",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: "0.75rem",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontWeight: 800,
              fontSize: "1rem",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {item.itemName || "Untitled Item"}
          </div>

          <div
            style={{
              color: "var(--text-muted)",
              fontSize: "0.75rem",
              marginTop: "0.2rem",
            }}
          >
            {item.itemType} · {item.section || "General"}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: "0.4rem",
            flexShrink: 0,
          }}
        >
          {item.showNewTag && (
            <span
              style={{
                background: "var(--blue)",
                color: "#fff",
                fontSize: "0.62rem",
                fontWeight: 900,
                padding: "0.22rem 0.45rem",
                borderRadius: "999px",
              }}
            >
              NEW
            </span>
          )}

          {item.showLeavingTodayTag && (
            <span
              style={{
                background: "#0f0d1b",
                color: "var(--accent)",
                border: "1px solid rgba(255,193,7,0.3)",
                fontSize: "0.62rem",
                fontWeight: 900,
                padding: "0.22rem 0.45rem",
                borderRadius: "999px",
              }}
            >
              LEAVING
            </span>
          )}
        </div>
      </div>

      <div
        className="admin-shop-item-fields"
        style={{
          display: "grid",
          gridTemplateColumns: "1.4fr 1fr 0.7fr",
          gap: "0.65rem",
        }}
      >
        <div>
          <div style={smallLabelStyle}>Name</div>
          <input
            value={item.itemName || ""}
            onChange={(e) => onChange(item.id, "itemName", e.target.value)}
            style={inputStyle}
          />
        </div>

        <div>
          <div style={smallLabelStyle}>Type</div>
          <select
            value={item.itemType}
            onChange={(e) =>
              onChange(
                item.id,
                "itemType",
                e.target.value as ShopItem["itemType"]
              )
            }
            style={inputStyle}
          >
            <option value="avatar">Avatar</option>
            <option value="banner">Banner</option>
            <option value="song">Song</option>
            <option value="title">Title</option>
          </select>
        </div>

        <div>
          <div style={smallLabelStyle}>Price</div>
          <input
            type="number"
            value={item.price || 0}
            onChange={(e) => onChange(item.id, "price", Number(e.target.value))}
            style={inputStyle}
          />
        </div>
      </div>

      <div
        className="admin-shop-item-pair"
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "0.65rem",
        }}
      >
        <div>
          <div style={smallLabelStyle}>Section</div>
          <input
            value={item.section || ""}
            onChange={(e) => onChange(item.id, "section", e.target.value)}
            style={inputStyle}
          />
        </div>

        <div>
          <div style={smallLabelStyle}>Rarity</div>
          <input
            value={item.rarity || ""}
            onChange={(e) => onChange(item.id, "rarity", e.target.value)}
            style={inputStyle}
          />
        </div>
      </div>

      <div
        className="admin-shop-item-pair"
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "0.65rem",
        }}
      >
        <div>
          <div style={smallLabelStyle}>Image URL</div>
          <input
            value={item.previewImage || ""}
            onChange={(e) => onChange(item.id, "previewImage", e.target.value)}
            style={inputStyle}
          />
        </div>

        <div>
          <div style={smallLabelStyle}>Song URL</div>
          <input
            value={item.songUrl || ""}
            onChange={(e) => onChange(item.id, "songUrl", e.target.value)}
            style={inputStyle}
          />
        </div>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "0.75rem",
          flexWrap: "wrap",
          borderTop: "1px solid var(--border)",
          paddingTop: "0.85rem",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: "0.85rem",
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <label style={toggleLabelStyle}>
            <input
              type="checkbox"
              checked={!!item.showNewTag}
              onChange={(e) =>
                onChange(item.id, "showNewTag", e.target.checked)
              }
            />
            NEW
          </label>

          <label style={toggleLabelStyle}>
            <input
              type="checkbox"
              checked={!!item.showLeavingTodayTag}
              onChange={(e) => onChange(item.id, "showLeavingTodayTag", e.target.checked)}
            />
            LEAVING
          </label>

          <label style={toggleLabelStyle}>
            <input
              type="checkbox"
              checked={!!item.isVisible}
              onChange={(e) => onChange(item.id, "isVisible", e.target.checked)}
            />
            Visible
          </label>
        </div>

        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            onClick={() => onSave(item)}
            disabled={saving === item.id}
            style={{
              background: saved === item.id ? "var(--green)" : "var(--accent)",
              color: "#000",
              border: "none",
              borderRadius: "8px",
              padding: "0.5rem 0.9rem",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            {saving === item.id
              ? "Saving..."
              : saved === item.id
              ? "Saved"
              : "Save"}
          </button>

          <button
            onClick={onDelete}
            style={{
              background: "transparent",
              border: "1px solid var(--border)",
              color: "var(--red)",
              borderRadius: "8px",
              padding: "0.5rem 0.75rem",
              cursor: "pointer",
              fontWeight: 800,
            }}
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}

function LimitedCardFields({
  card,
  players,
  onChange,
}: {
  card: Partial<LimitedCard>;
  players: Player[];
  onChange: (patch: Partial<LimitedCard>) => void;
}) {
  const linkedPlayer = players.find((p) => p.id === card.playerId);
  const statOptions = limitedCardStatOptions(linkedPlayer?.game);
  const statValues = statOptions.map((option) => option.value);
  const currentStat = String(card.boostStat || "");
  const showCurrentStat = currentStat && !statValues.includes(currentStat);

  return (
    <div>
      <div
        className="admin-shop-form-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "0.85rem",
          marginBottom: "0.85rem",
        }}
      >
        <ShopTextInput
          label="Card Name"
          value={card.cardName || ""}
          onChange={(value) => onChange({ cardName: value })}
        />

        <div>
          <div style={{ fontSize: "0.7rem", marginBottom: "0.3rem" }}>
            Linked Player
          </div>
          <select
            value={card.playerId || ""}
            onChange={(e) => {
              const playerId = e.target.value;
              const player = players.find((p) => p.id === playerId);
              const nextStatValues = limitedCardStatOptions(
                player?.game
              ).map((option) => option.value);
              const patch: Partial<LimitedCard> = { playerId };

              if (
                card.boostStat &&
                !nextStatValues.includes(String(card.boostStat))
              ) {
                patch.boostStat = nextStatValues.includes("kills")
                  ? "kills"
                  : nextStatValues[0] || "kills";
              }

              onChange(patch);
            }}
            style={inputStyle}
          >
            <option value="">Choose player</option>
            {players.map((player) => (
              <option key={player.id} value={player.id}>
                {player.name} · {player.game}
              </option>
            ))}
          </select>
        </div>

        <div>
          <div style={{ fontSize: "0.7rem", marginBottom: "0.3rem" }}>
            Rarity
          </div>
          <select
            value={card.rarity || "rare"}
            onChange={(e) => onChange({ rarity: e.target.value })}
            style={inputStyle}
          >
            {LIMITED_CARD_RARITIES.map((rarity) => (
              <option key={rarity} value={rarity}>
                {rarity}
              </option>
            ))}
          </select>
        </div>

        <div>
          <div style={{ fontSize: "0.7rem", marginBottom: "0.3rem" }}>
            Boost Stat
          </div>
          <select
            value={currentStat || statValues[0] || "kills"}
            onChange={(e) => onChange({ boostStat: e.target.value })}
            style={inputStyle}
          >
            {showCurrentStat && (
              <option value={currentStat}>
                {limitedCardStatLabel(currentStat)} (other game)
              </option>
            )}
            {statOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <ShopTextInput
          label="Boost Multiplier (×)"
          type="number"
          value={card.boostValue ?? 1.5}
          onChange={(value) => onChange({ boostValue: Number(value) })}
        />

        <ShopTextInput
          label="Shop Price (coins)"
          type="number"
          value={card.shopPrice ?? 0}
          onChange={(value) => onChange({ shopPrice: Number(value) })}
        />

        <ShopTextInput
          label="Transfers Price (m)"
          type="number"
          value={card.transferPrice ?? 0}
          onChange={(value) => onChange({ transferPrice: Number(value) })}
        />

        <ShopTextInput
          label="Stock (copies left)"
          type="number"
          value={card.stock ?? 1}
          onChange={(value) => onChange({ stock: Number(value) })}
        />
      </div>

      <div
        className="admin-shop-url-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: "0.85rem",
          marginBottom: "0.85rem",
        }}
      >
        <ShopTextInput
          label="Power-up Text (optional override)"
          value={card.powerupText || ""}
          onChange={(value) => onChange({ powerupText: value })}
        />

        <ShopTextInput
          label="Image URL"
          value={card.image || ""}
          onChange={(value) => onChange({ image: value })}
        />

        <div>
          <div style={{ fontSize: "0.7rem", marginBottom: "0.3rem" }}>
            Accent Color
          </div>
          <input
            type="color"
            value={
              card.accentColor || getLimitedCardRarityColor(card.rarity)
            }
            onChange={(e) => onChange({ accentColor: e.target.value })}
            style={{
              ...inputStyle,
              padding: "0.3rem",
              height: "38px",
              cursor: "pointer",
            }}
          />
        </div>
      </div>
    </div>
  );
}

function LimitedCardPreview({
  card,
  players,
}: {
  card: Partial<LimitedCard>;
  players: Player[];
}) {
  const rarityColor = getLimitedCardRarityColor(card.rarity, card.accentColor);
  const linkedPlayer = players.find((p) => p.id === card.playerId);
  const imageUrl = getLimitedCardImageUrl(card.image);

  return (
    <div
      style={{
        width: "100%",
        borderRadius: "16px",
        overflow: "hidden",
        border: `1px solid ${rarityColor}66`,
        background: `linear-gradient(160deg, ${rarityColor}26, rgba(255,255,255,0.02)), var(--surface)`,
        boxShadow: `0 12px 32px ${rarityColor}1f`,
      }}
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          aspectRatio: "4/3",
          background: `radial-gradient(circle at 30% 20%, ${rarityColor}33, transparent 45%), #111`,
        }}
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={card.cardName || "Mastery card"}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
            }}
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "rgba(255,255,255,0.25)",
              fontWeight: 900,
              fontSize: "1.8rem",
            }}
          >
            {(card.cardName || "?").slice(0, 1)}
          </div>
        )}

        <span
          style={{
            position: "absolute",
            top: "0.55rem",
            left: "0.55rem",
            background: "rgba(0,0,0,0.55)",
            border: `1px solid ${rarityColor}80`,
            color: rarityColor,
            fontSize: "0.58rem",
            fontWeight: 900,
            padding: "0.2rem 0.45rem",
            borderRadius: "999px",
            textTransform: "uppercase",
            letterSpacing: "0.6px",
          }}
        >
          {card.rarity || "rare"}
        </span>
      </div>

      <div style={{ padding: "0.7rem" }}>
        <div
          style={{
            fontWeight: 900,
            fontSize: "0.9rem",
            lineHeight: 1.2,
            marginBottom: "0.3rem",
          }}
        >
          {card.cardName || "Untitled Card"}
        </div>

        <div
          style={{
            color: "var(--text-muted)",
            fontSize: "0.68rem",
            marginBottom: "0.4rem",
          }}
        >
          {linkedPlayer
            ? `${linkedPlayer.name} · ${linkedPlayer.game}`
            : "No player linked"}
        </div>

        <div
          style={{
            color: "var(--accent)",
            fontSize: "0.68rem",
            fontWeight: 800,
            lineHeight: 1.35,
            minHeight: "2rem",
            marginBottom: "0.5rem",
          }}
        >
          {limitedCardPowerupText({
            boostStat: card.boostStat,
            boostValue: card.boostValue,
            powerupText: card.powerupText,
          })}
        </div>

        <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
          <span
            style={{
              background: "rgba(255,193,7,0.1)",
              border: "1px solid rgba(255,193,7,0.25)",
              color: "var(--accent)",
              fontSize: "0.62rem",
              fontWeight: 900,
              padding: "0.22rem 0.45rem",
              borderRadius: "999px",
            }}
          >
            {Number(card.shopPrice || 0).toLocaleString()} coins
          </span>

          <span
            style={{
              background: "rgba(3,71,244,0.12)",
              border: "1px solid rgba(107,159,255,0.35)",
              color: "#8bb5ff",
              fontSize: "0.62rem",
              fontWeight: 900,
              padding: "0.22rem 0.45rem",
              borderRadius: "999px",
            }}
          >
            +{Number(card.transferPrice || 0).toFixed(1)}m squad cost
          </span>
        </div>
      </div>
    </div>
  );
}

function LimitedCardEditor({
  card,
  players,
  saving,
  saved,
  onChange,
  onSave,
  onDelete,
}: {
  card: LimitedCard;
  players: Player[];
  saving: string | null;
  saved: string | null;
  onChange: (id: string, patch: Partial<LimitedCard>) => void;
  onSave: (card: LimitedCard) => void;
  onDelete: () => void;
}) {
  return (
    <div
      className="admin-shop-item-card"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "14px",
        padding: "1rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.85rem",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: "0.75rem",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontWeight: 800,
              fontSize: "1rem",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {card.cardName || "Untitled Card"}
          </div>

          <div
            style={{
              color: "var(--text-muted)",
              fontSize: "0.75rem",
              marginTop: "0.2rem",
            }}
          >
            {card.rarity || "rare"} · stock {Number(card.stock || 0)}
            {card.isVisible === false ? " · hidden" : ""}
          </div>
        </div>

        <div style={{ display: "flex", gap: "0.4rem", flexShrink: 0 }}>
          {card.showNewTag && (
            <span
              style={{
                background: "var(--blue)",
                color: "#fff",
                fontSize: "0.62rem",
                fontWeight: 900,
                padding: "0.22rem 0.45rem",
                borderRadius: "999px",
              }}
            >
              NEW
            </span>
          )}

          {card.showLeavingTodayTag && (
            <span
              style={{
                background: "#0f0d1b",
                color: "var(--accent)",
                border: "1px solid rgba(255,193,7,0.3)",
                fontSize: "0.62rem",
                fontWeight: 900,
                padding: "0.22rem 0.45rem",
                borderRadius: "999px",
              }}
            >
              LEAVING
            </span>
          )}
        </div>
      </div>

      <div style={{ display: "grid", justifyItems: "center" }}>
        <div style={{ width: "min(100%, 190px)" }}>
          <LimitedCardPreview card={card} players={players} />
        </div>
      </div>

      <LimitedCardFields
        card={card}
        players={players}
        onChange={(patch) => onChange(card.id, patch)}
      />

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "0.75rem",
          flexWrap: "wrap",
          borderTop: "1px solid var(--border)",
          paddingTop: "0.85rem",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: "0.85rem",
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <label style={toggleLabelStyle}>
            <input
              type="checkbox"
              checked={!!card.showNewTag}
              onChange={(e) =>
                onChange(card.id, { showNewTag: e.target.checked })
              }
            />
            NEW
          </label>

          <label style={toggleLabelStyle}>
            <input
              type="checkbox"
              checked={!!card.showLeavingTodayTag}
              onChange={(e) =>
                onChange(card.id, { showLeavingTodayTag: e.target.checked })
              }
            />
            LEAVING
          </label>

          <label style={toggleLabelStyle}>
            <input
              type="checkbox"
              checked={card.isVisible !== false}
              onChange={(e) =>
                onChange(card.id, { isVisible: e.target.checked })
              }
            />
            Visible
          </label>
        </div>

        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            onClick={() => onSave(card)}
            disabled={saving === card.id}
            style={{
              background: saved === card.id ? "var(--green)" : "var(--accent)",
              color: "#000",
              border: "none",
              borderRadius: "8px",
              padding: "0.5rem 0.9rem",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            {saving === card.id
              ? "Saving..."
              : saved === card.id
              ? "Saved"
              : "Save"}
          </button>

          <button
            onClick={onDelete}
            style={{
              background: "transparent",
              border: "1px solid var(--border)",
              color: "var(--red)",
              borderRadius: "8px",
              padding: "0.5rem 0.75rem",
              cursor: "pointer",
              fontWeight: 800,
            }}
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}

function StatInput({
  label,
  id,
  val,
  set,
}: {
  label: string;
  id: string;
  val: any;
  set: any;
}) {
  return (
    <div>
      <div
        style={{
          fontSize: "0.75rem",
          color: "var(--text-muted)",
          marginBottom: "0.3rem",
        }}
      >
        {label}
      </div>

      <input
        type="number"
        value={val[id] || ""}
        onChange={(e) => set({ ...val, [id]: e.target.value })}
        style={{
          width: "100%",
          background: "var(--bg)",
          border: "1px solid var(--border)",
          color: "#fff",
          padding: "0.5rem",
          borderRadius: "6px",
        }}
      />
    </div>
  );
}

const inputStyle = {
  width: "100%",
  background: "var(--bg)",
  border: "1px solid var(--border)",
  color: "#fff",
  padding: "0.5rem",
  borderRadius: "6px",
  fontSize: "0.85rem",
};

const labelStyle = {
  fontSize: "0.8rem",
  color: "var(--text-muted)",
  marginBottom: "0.4rem",
};

const smallLabelStyle = {
  fontSize: "0.68rem",
  marginBottom: "0.25rem",
};

const sectionTitleStyle = {
  fontSize: "1.2rem",
  fontWeight: 700,
  marginBottom: "1.5rem",
};

const panelStyle = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: "12px",
  padding: "1.5rem",
  display: "flex",
  flexDirection: "column" as const,
  gap: "1.5rem",
};

const toggleLabelStyle = {
  display: "flex",
  alignItems: "center",
  gap: "0.4rem",
  fontSize: "0.75rem",
  color: "var(--text-muted)",
};

const smallButtonStyle = {
  background: "var(--bg)",
  border: "1px solid var(--border)",
  color: "#fff",
  width: "40px",
  height: "40px",
  borderRadius: "8px",
  cursor: "pointer",
  fontSize: "1.2rem",
};

const secondaryButtonStyle = {
  background: "transparent",
  border: "1px solid var(--border)",
  color: "var(--text-muted)",
  borderRadius: "8px",
  padding: "0.55rem 0.75rem",
  fontWeight: 800,
  cursor: "pointer",
};

const primaryButtonStyle = (isSaved: boolean) => ({
  background: isSaved ? "var(--green)" : "var(--blue)",
  color: "#fff",
  border: "none",
  padding: "0.8rem",
  borderRadius: "8px",
  fontWeight: 700,
  cursor: "pointer",
});
