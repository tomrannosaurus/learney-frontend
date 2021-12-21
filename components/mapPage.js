import ReactGA from "react-ga";
import {
  GetNextConceptButton,
  ResetPanButton,
  ResetProgressIconButton,
} from "./buttons";
import React, { useEffect, useState } from "react";
import {
  setupTracking,
  initialiseMixpanelTracking,
} from "../lib/trackingScripts";
import { useUser } from "@auth0/nextjs-auth0";
import {
  buttonPress,
  isAnonymousUser,
  logPageView,
  recordUserId,
} from "../lib/utils";
import MapHeader from "./mapHeader";
import Map from "./map";
import { goalNodes, learnedNodes } from "../lib/learningAndPlanning/variables";
import {
  learnedSliderClick,
  setGoalClick,
  initialiseSignInTooltip,
} from "../lib/learningAndPlanning/learningAndPlanning";
import { EditNavbar, LearnNavbar } from "./navbar";
import Editor from "./editor/editor";
import { getNextNodeToLearn } from "../lib/questions";

export default function MapPage({
  backendUrl,
  mapUrlExtension,
  allowSuggestions,
  editMap,
  mapJson,
  mapUUID,
}) {
  if (backendUrl === "https://api.learney.me") {
    ReactGA.initialize("UA-197170313-2");
  } else {
    ReactGA.initialize("UA-197170313-1", { debug: true });
  }

  const { user, isLoading } = useUser();
  const [userId, setUserId] = React.useState(undefined);
  const [userEmail, setUserEmail] = React.useState("");
  const [sessionId, setSessionId] = React.useState(null);

  const [goals, setNewGoalsState] = React.useState({});
  const setGoalsState = function (goalState) {
    for (const [nodeId, _] of Object.entries(goals)) {
      if (!(nodeId in goalState)) {
        setNewGoalsState((prevGoals) => ({
          ...prevGoals,
          [nodeId]: undefined,
        }));
      }
    }
    for (const [nodeId, isGoal] of Object.entries(goalState)) {
      setNewGoalsState((prevGoals) => ({ ...prevGoals, [nodeId]: isGoal }));
    }
  };
  const onSetGoalClick = function (node, userId, sessionId) {
    setGoalClick(node, backendUrl, userId, mapUUID, sessionId);
    setGoalsState(goalNodes);
  };

  const [learned, setNewLearnedState] = React.useState({});
  const setLearnedState = function (learnedState) {
    for (const [nodeId, _] of Object.entries(learned)) {
      if (!(nodeId in learnedState)) {
        setNewLearnedState((prevLearned) => ({
          ...prevLearned,
          [nodeId]: undefined,
        }));
      }
    }
    for (const [nodeId, isLearned] of Object.entries(learnedState)) {
      setNewLearnedState((prevLearned) => ({
        ...prevLearned,
        [nodeId]: isLearned,
      }));
    }
  };
  const onLearnedClick = function (node, userId, sessionId) {
    learnedSliderClick(node, backendUrl, userId, mapUUID, sessionId);
    setLearnedState(learnedNodes);
  };

  const buttonPressFunction = function (runFirst, buttonName) {
    return buttonPress(runFirst, buttonName, backendUrl, userId);
  };

  const [pageLoaded, setPageLoaded] = React.useState(false);
  useEffect(() => {
    (async function () {
      if (!isLoading) {
        let responseJson = await logPageView(user, backendUrl, mapUrlExtension);
        setSessionId(responseJson.session_id);

        let newUserId;
        if (user !== undefined) {
          newUserId = user.sub;
          setUserEmail(user.email);
        } else {
          newUserId = responseJson.user_id;
          recordUserId(newUserId);
        }
        setUserId(newUserId);

        setupTracking();
        ReactGA.pageview(window.location.pathname);
        initialiseMixpanelTracking(newUserId);

        if (isAnonymousUser(newUserId)) initialiseSignInTooltip();
      }
    })();
  }, [isLoading]);

  const [editType, setEditType] = React.useState(null);

  const [nextConcept, setNextConcept] = useState(null);
  useEffect(() => {
    if (!editMap && pageLoaded) setNextConcept(getNextNodeToLearn());
  }, [pageLoaded, learned, goals]);

  return (
    <div>
      <MapHeader editMode={editMap} mapUrlExtension={mapUrlExtension} />
      {!isLoading &&
        (editMap ? (
          <EditNavbar
            user={user}
            userId={userId}
            buttonPressFunction={buttonPressFunction}
            backendUrl={backendUrl}
            mapUUID={mapUUID}
            mapJson={mapJson}
            pageLoaded={pageLoaded}
          />
        ) : (
          <LearnNavbar
            user={user}
            pageLoaded={pageLoaded}
            buttonPressFunction={buttonPressFunction}
            mapJson={mapJson}
          />
        ))}

      <Map
        backendUrl={backendUrl}
        userId={userId}
        userEmail={userEmail}
        allowSuggestions={allowSuggestions}
        editMap={editMap}
        mapJson={mapJson}
        mapUUID={mapUUID}
        sessionId={sessionId}
        buttonPressFunction={buttonPressFunction}
        learned={learned}
        onLearnedClick={onLearnedClick}
        setLearnedState={setLearnedState}
        goals={goals}
        onSetGoalClick={onSetGoalClick}
        setGoalsState={setGoalsState}
        setPageLoaded={setPageLoaded}
        editType={editType}
      />
      <div
        className={`flex flex-row items-end absolute bottom-0 right-0 mx-8 my-4 disableTouchActions`}
      >
        {!editMap && (
          <GetNextConceptButton
            nextConcept={nextConcept}
            buttonPressFunction={buttonPressFunction}
          />
        )}
        <ResetPanButton buttonPressFunction={buttonPressFunction} />
        {!editMap && (
          <ResetProgressIconButton
            buttonPressFunction={buttonPressFunction}
            backendUrl={backendUrl}
            userId={userId}
            mapUUID={mapUUID}
            sessionId={sessionId}
            setGoalsState={setGoalsState}
            setLearnedState={setLearnedState}
          />
        )}
      </div>
      {editMap && (
        <Editor
          buttonPressFunction={buttonPressFunction}
          backendUrl={backendUrl}
          userId={userId}
          mapUUID={mapUUID}
          pageLoaded={pageLoaded}
          editType={editType}
          setEditType={setEditType}
        />
      )}
    </div>
  );
}
